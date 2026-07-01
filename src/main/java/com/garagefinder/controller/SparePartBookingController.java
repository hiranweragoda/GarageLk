package com.garagefinder.controller;

import com.garagefinder.model.*;
import com.garagefinder.repository.*;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping
public class SparePartBookingController {

    private final SparePartBookingRepository bookingRepository;
    private final SparePartRepository partRepository;
    private final SparePartShopRepository shopRepository;
    private final ShopReviewRepository shopReviewRepository;
    private final NotificationRepository notificationRepository;

    public SparePartBookingController(
            SparePartBookingRepository bookingRepository,
            SparePartRepository partRepository,
            SparePartShopRepository shopRepository,
            ShopReviewRepository shopReviewRepository,
            NotificationRepository notificationRepository) {
        this.bookingRepository = bookingRepository;
        this.partRepository = partRepository;
        this.shopRepository = shopRepository;
        this.shopReviewRepository = shopReviewRepository;
        this.notificationRepository = notificationRepository;
    }

    private Map<String, Object> buildBookingMap(SparePartBooking b) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", b.getId());
        map.put("bookingCode", b.getBookingCode());
        map.put("quantity", b.getQuantity());
        map.put("totalPrice", b.getTotalPrice());
        map.put("status", b.getStatus());
        map.put("bookingDate", b.getBookingDate());
        map.put("pickupDate", b.getPickupDate());
        map.put("notes", b.getNotes());
        map.put("cancellationReason", b.getCancellationReason());

        // customer.user structure expected by frontend (b.customer.user.fullName)
        Map<String, Object> customerMap = new LinkedHashMap<>();
        Map<String, Object> userMap = new LinkedHashMap<>();
        User cust = b.getCustomer();
        if (cust != null) {
            userMap.put("id", cust.getId());
            userMap.put("username", cust.getUsername());
            userMap.put("fullName", cust.getFullName());
            userMap.put("email", cust.getEmail());
            userMap.put("phone", cust.getPhone());
        }
        customerMap.put("user", userMap);
        map.put("customer", customerMap);

        // sparePart with nested shop
        Map<String, Object> partMap = new LinkedHashMap<>();
        SparePart sp = b.getSparePart();
        if (sp != null) {
            partMap.put("id", sp.getId());
            partMap.put("partName", sp.getPartName());
            partMap.put("vehicleModel", sp.getVehicleModel());
            partMap.put("vehicleYear", sp.getVehicleYear());
            partMap.put("price", sp.getPrice());
            partMap.put("quantity", sp.getQuantity());
            partMap.put("status", sp.getStatus());
            partMap.put("imageUrl", sp.getImageUrl());

            Map<String, Object> shopMap = new LinkedHashMap<>();
            SparePartShop shop = sp.getShop();
            if (shop != null) {
                shopMap.put("id", shop.getId());
                shopMap.put("shopName", shop.getShopName());
                shopMap.put("ownerName", shop.getOwnerName());
                shopMap.put("address", shop.getAddress());
                shopMap.put("city", shop.getCity());
                shopMap.put("phone", shop.getPhone());
            }
            partMap.put("shop", shopMap);
        }
        map.put("sparePart", partMap);

        return map;
    }

    @PostMapping("/api/spare-parts/bookings")
    public ResponseEntity<?> createBooking(@RequestBody Map<String, Object> payload, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"CUSTOMER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Only customers can book spare parts"));
        }

        if (payload.get("partId") == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "partId is required"));
        }
        Long partId = Long.parseLong(payload.get("partId").toString());
        Optional<SparePart> partOpt = partRepository.findById(partId);
        if (partOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Spare part not found"));
        }

        SparePart part = partOpt.get();
        int quantity = 1;
        if (payload.get("quantity") != null) {
            try {
                quantity = Integer.parseInt(payload.get("quantity").toString());
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid quantity format"));
            }
        }

        if (quantity < 1) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Quantity must be at least 1"));
        }

        if (part.getQuantity() < quantity) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Insufficient stock. Only " + part.getQuantity() + " units available."));
        }

        String notes = payload.get("notes") != null ? payload.get("notes").toString().trim() : "";
        String pickupDateStr = payload.get("pickupDate") != null ? payload.get("pickupDate").toString() : null;
        LocalDateTime pickupDate = null;
        if (pickupDateStr != null && !pickupDateStr.isEmpty()) {
            try {
                pickupDate = LocalDateTime.parse(pickupDateStr);
            } catch (Exception e) {
                try {
                    pickupDate = java.time.LocalDate.parse(pickupDateStr).atStartOfDay();
                } catch (Exception ex) {
                    pickupDate = LocalDateTime.now().plusDays(2);
                }
            }
        } else {
            pickupDate = LocalDateTime.now().plusDays(2);
        }

        double totalPrice = part.getPrice() * quantity;

        // Deduct from stock
        part.setQuantity(part.getQuantity() - quantity);
        partRepository.save(part);

        SparePartBooking booking = new SparePartBooking(user, part, quantity, totalPrice, "PENDING", pickupDate, notes);
        
        String bookingCode;
        String dateStr = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        String pattern = "SPB-" + dateStr + "%";
        long countToday = bookingRepository.countByBookingCodeLike(pattern);
        long seq = countToday + 1;
        do {
            bookingCode = String.format("SPB-%s%02d", dateStr, seq++);
        } while (bookingRepository.findByBookingCode(bookingCode).isPresent());
        booking.setBookingCode(bookingCode);

        bookingRepository.save(booking);

        try {
            Long ownerUserId = part.getShop().getUser().getId();
            String msg = String.format("New spare part reservation for %s (Code: %s)", 
                part.getPartName(), bookingCode);
            notificationRepository.save(new Notification(ownerUserId, msg));
        } catch (Exception e) {
            e.printStackTrace();
        }

        return ResponseEntity.ok(Map.of("message", "Spare part booked successfully!", "bookingId", booking.getId()));
    }

    @GetMapping("/api/spare-parts/bookings/my")
    public ResponseEntity<?> getMyBookings(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"CUSTOMER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<SparePartBooking> bookings = bookingRepository.findByCustomerIdOrderByBookingDateDesc(user.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (SparePartBooking b : bookings) {
            result.add(buildBookingMap(b));
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/api/spare-parts/bookings/shop")
    public ResponseEntity<?> getShopBookings(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"SHOP_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<SparePartShop> shops = shopRepository.findByUserId(user.getId());
        if (shops.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<Long> shopIds = shops.stream().map(s -> s.getId()).toList();
        List<SparePartBooking> bookings = bookingRepository.findBySparePartShopIdInOrderByBookingDateDesc(shopIds);
        List<Map<String, Object>> result = new ArrayList<>();
        for (SparePartBooking b : bookings) {
            result.add(buildBookingMap(b));
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/api/spare-parts/bookings/all")
    public ResponseEntity<?> getAllSparePartBookings(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        List<SparePartBooking> bookings = bookingRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        for (SparePartBooking b : bookings) {
            result.add(buildBookingMap(b));
        }
        return ResponseEntity.ok(result);
    }

    @PutMapping("/api/spare-parts/bookings/{id}/status")
    public ResponseEntity<?> updateBookingStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload,
            HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<SparePartBooking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        SparePartBooking booking = bookingOpt.get();
        String newStatus = payload.get("status") != null ? payload.get("status").toString().toUpperCase() : null;

        if (newStatus == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "status is required"));
        }

        boolean isAuthorized = false;
        if ("CUSTOMER".equals(user.getRole())) {
            if (booking.getCustomer().getId().equals(user.getId())) {
                if ("CANCELLED".equals(newStatus)) {
                    isAuthorized = true;
                } else {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Customers can only cancel bookings"));
                }
            }
        } else if ("SHOP_OWNER".equals(user.getRole())) {
            List<SparePartShop> shops = shopRepository.findByUserId(user.getId());
            isAuthorized = shops.stream().anyMatch(s -> s.getId().equals(booking.getSparePart().getShop().getId()));
        } else if ("ADMIN".equals(user.getRole())) {
            isAuthorized = true;
        }

        if (!isAuthorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        String oldStatus = booking.getStatus();
        if (oldStatus.equals(newStatus)) {
            return ResponseEntity.ok(Map.of("message", "Status is already " + newStatus));
        }

        // If cancelling, add reserved quantity back to spare part stock
        if ("CANCELLED".equals(newStatus) && !"CANCELLED".equals(oldStatus) && !"PICKED_UP".equals(oldStatus)) {
            SparePart part = booking.getSparePart();
            part.setQuantity(part.getQuantity() + booking.getQuantity());
            partRepository.save(part);
        }

        booking.setStatus(newStatus);
        if ("CANCELLED".equals(newStatus) && payload.get("cancellationReason") != null) {
            booking.setCancellationReason(payload.get("cancellationReason").toString());
        }
        bookingRepository.save(booking);

        try {
            Long customerUserId = booking.getCustomer().getId();
            String msg = String.format("Your reservation for %s is %s at %s. (Code: %s)",
                booking.getSparePart().getPartName(), newStatus.replace("_", " "), booking.getSparePart().getShop().getShopName(), booking.getBookingCode());
            notificationRepository.save(new Notification(customerUserId, msg));
        } catch (Exception e) {
            e.printStackTrace();
        }

        return ResponseEntity.ok(Map.of("message", "Booking status updated to " + newStatus));
    }

    @DeleteMapping("/api/spare-parts/bookings/{id}")
    public ResponseEntity<?> deleteBooking(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<SparePartBooking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        SparePartBooking booking = bookingOpt.get();

        boolean authorized = false;
        if ("ADMIN".equals(user.getRole())) {
            authorized = true;
        } else if ("SHOP_OWNER".equals(user.getRole())) {
            List<SparePartShop> shops = shopRepository.findByUserId(user.getId());
            if ("PICKED_UP".equals(booking.getStatus()) || "CANCELLED".equals(booking.getStatus())) {
                authorized = shops.stream().anyMatch(s -> s.getId().equals(booking.getSparePart().getShop().getId()));
            }
        }

        if (!authorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        // Delete any linked ShopReview first
        Optional<ShopReview> reviewOpt = shopReviewRepository.findBySparePartBookingId(id);
        reviewOpt.ifPresent(shopReviewRepository::delete);

        bookingRepository.delete(booking);
        return ResponseEntity.ok(Map.of("message", "Spare part reservation history item deleted successfully"));
    }
}
