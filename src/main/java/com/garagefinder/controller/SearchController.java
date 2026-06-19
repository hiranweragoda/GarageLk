package com.garagefinder.controller;

import com.garagefinder.model.*;
import com.garagefinder.repository.*;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final BookingRepository bookingRepository;
    private final SparePartBookingRepository sparePartBookingRepository;
    private final BreakdownRequestRepository breakdownRequestRepository;

    public SearchController(
            BookingRepository bookingRepository,
            SparePartBookingRepository sparePartBookingRepository,
            BreakdownRequestRepository breakdownRequestRepository) {
        this.bookingRepository = bookingRepository;
        this.sparePartBookingRepository = sparePartBookingRepository;
        this.breakdownRequestRepository = breakdownRequestRepository;
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<?> searchByCode(@PathVariable String code, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        String codeTrim = code.trim().toUpperCase();
        if (codeTrim.startsWith("GBK-")) {
            Optional<Booking> bookingOpt = bookingRepository.findByBookingCode(codeTrim);
            if (bookingOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Booking not found"));
            }
            Booking b = bookingOpt.get();
            // Validate if GARAGE_OWNER owns the garage for this booking, or ADMIN
            boolean isAuthorized = "ADMIN".equals(user.getRole()) ||
                    ("GARAGE_OWNER".equals(user.getRole()) && b.getGarage().getUser().getId().equals(user.getId()));

            if (!isAuthorized) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
            }

            Map<String, Object> details = new HashMap<>();
            details.put("type", "BOOKING");
            details.put("code", b.getBookingCode());
            details.put("id", b.getId());
            details.put("status", b.getStatus());
            details.put("serviceType", b.getServiceType());
            details.put("bookingDate", b.getBookingDate().toString());
            details.put("timeSlot", b.getTimeSlot());
            details.put("totalPrice", b.getTotalPrice() != null ? b.getTotalPrice() : (b.getPrice() != null ? b.getPrice() : 0.0));
            details.put("vehicleType", b.getVehicleType());
            details.put("vehicleNo", b.getVehicleNo());
            details.put("notes", b.getNotes());
            details.put("description", b.getDescription());
            details.put("cancellationReason", b.getCancellationReason());
            details.put("garageName", b.getGarage().getGarageName());
            
            // Customer user details
            User customerUser = b.getCustomer().getUser();
            details.put("customerName", customerUser.getFullName() != null ? customerUser.getFullName() : customerUser.getUsername());
            details.put("customerPhone", customerUser.getPhone());
            details.put("customerEmail", customerUser.getEmail());

            return ResponseEntity.ok(details);

        } else if (codeTrim.startsWith("SPB-")) {
            Optional<SparePartBooking> spbOpt = sparePartBookingRepository.findByBookingCode(codeTrim);
            if (spbOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Spare part reservation not found"));
            }
            SparePartBooking b = spbOpt.get();
            // Validate if SHOP_OWNER owns the shop for this part booking, or ADMIN
            boolean isAuthorized = "ADMIN".equals(user.getRole()) ||
                    ("SHOP_OWNER".equals(user.getRole()) && b.getSparePart().getShop().getUser().getId().equals(user.getId()));

            if (!isAuthorized) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
            }

            Map<String, Object> details = new HashMap<>();
            details.put("type", "SPARE_PART");
            details.put("code", b.getBookingCode());
            details.put("id", b.getId());
            details.put("status", b.getStatus());
            details.put("partName", b.getSparePart().getPartName());
            details.put("quantity", b.getQuantity());
            details.put("totalPrice", b.getTotalPrice());
            details.put("bookingDate", b.getBookingDate().toString());
            details.put("pickupDate", b.getPickupDate() != null ? b.getPickupDate().toString() : "N/A");
            details.put("notes", b.getNotes());
            details.put("cancellationReason", b.getCancellationReason());
            details.put("shopName", b.getSparePart().getShop().getShopName());

            // Customer user details
            User customerUser = b.getCustomer().getUser();
            details.put("customerName", customerUser.getFullName() != null ? customerUser.getFullName() : customerUser.getUsername());
            details.put("customerPhone", customerUser.getPhone());
            details.put("customerEmail", customerUser.getEmail());

            return ResponseEntity.ok(details);

        } else if (codeTrim.startsWith("EMB-")) {
            Optional<BreakdownRequest> breakdownOpt = breakdownRequestRepository.findByBreakdownCode(codeTrim);
            if (breakdownOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Breakdown request not found"));
            }
            BreakdownRequest b = breakdownOpt.get();
            // Validate if GARAGE_OWNER operates in the same city as request status is "OPEN",
            // or if the request is ACCEPTED/RESOLVED/COMPLETED and assigned to owner's garage, or ADMIN
            boolean isAuthorized = "ADMIN".equals(user.getRole()) ||
                    ("GARAGE_OWNER".equals(user.getRole()) && (
                            "OPEN".equals(b.getStatus()) || 
                            (b.getAssignedGarage() != null && b.getAssignedGarage().getUser().getId().equals(user.getId()))
                    ));

            if (!isAuthorized) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
            }

            Map<String, Object> details = new HashMap<>();
            details.put("type", "BREAKDOWN");
            details.put("code", b.getBreakdownCode());
            details.put("id", b.getId());
            details.put("status", b.getStatus());
            details.put("description", b.getDescription());
            details.put("locationCity", b.getLocationCity());
            details.put("address", b.getAddress());
            details.put("vehicleNo", b.getVehicleNo());
            details.put("contactPhone", b.getContactPhone());
            details.put("createdAt", b.getCreatedTime().toString());
            details.put("latitude", b.getLatitude());
            details.put("longitude", b.getLongitude());
            details.put("cancellationReason", b.getCancellationReason());
            
            if (b.getAssignedGarage() != null) {
                details.put("assignedGarageName", b.getAssignedGarage().getGarageName());
            }
            if (b.getAssignedMechanic() != null) {
                details.put("assignedMechanicName", b.getAssignedMechanic().getName());
                details.put("assignedMechanicPhone", b.getAssignedMechanic().getPhone());
            }

            // Customer user details
            User customerUser = b.getCustomer().getUser();
            details.put("customerName", customerUser.getFullName() != null ? customerUser.getFullName() : customerUser.getUsername());
            details.put("customerPhone", customerUser.getPhone());
            details.put("customerEmail", customerUser.getEmail());

            return ResponseEntity.ok(details);
        }

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid code prefix. Must start with GBK-, SPB-, or EMB-"));
    }
}
