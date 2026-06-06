package com.garagefinder.controller;

import com.garagefinder.model.Booking;
import com.garagefinder.model.Customer;
import com.garagefinder.model.Garage;
import com.garagefinder.model.User;
import com.garagefinder.repository.BookingRepository;
import com.garagefinder.repository.CustomerRepository;
import com.garagefinder.repository.GarageRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private GarageRepository garageRepository;

    // Create a new booking (Customer only)
    @PostMapping
    public ResponseEntity<?> createBooking(@RequestBody Map<String, Object> payload, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"CUSTOMER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Only customers can book services"));
        }

        Optional<Customer> customerOpt = customerRepository.findByUserId(user.getId());
        if (customerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Customer profile not found"));
        }

        if (payload.get("garageId") == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "garageId is required"));
        }
        Long garageId = Long.parseLong(payload.get("garageId").toString());
        Optional<Garage> garageOpt = garageRepository.findById(garageId);
        if (garageOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Garage not found"));
        }

        String description = payload.get("description") != null ? payload.get("description").toString() : null;
        String timeSlot = payload.get("timeSlot") != null ? payload.get("timeSlot").toString() : null;
        String vehicleNo = payload.get("vehicleNo") != null ? payload.get("vehicleNo").toString() : null;
        String vehicleType = payload.get("vehicleType") != null ? payload.get("vehicleType").toString() : null;
        
        String serviceType = extractServiceType(description);
        String bookingDateStr = payload.get("bookingDate") != null ? payload.get("bookingDate").toString() : null;
        Double price = parsePrice(payload);
        String notes = description;

        LocalDateTime bookingDate = parseDateTime(bookingDateStr, timeSlot);

        // Time-slot conflict check: reject if another booking exists within ±1 hour
        LocalDateTime windowStart = bookingDate.minusHours(1);
        LocalDateTime windowEnd = bookingDate.plusHours(1);
        List<Booking> conflicts = bookingRepository.findConflictingBookings(garageId, windowStart, windowEnd);
        if (!conflicts.isEmpty()) {
            Booking conflict = conflicts.get(0);
            String conflictTime = conflict.getBookingDate()
                .format(DateTimeFormatter.ofPattern("MMM dd, yyyy 'at' hh:mm a"));
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "message", "This time slot is already booked. The garage has another appointment on " +
                           conflictTime + ". Please choose a time at least 1 hour before or after."
            ));
        }

        Booking booking = new Booking(customerOpt.get(), garageOpt.get(), serviceType, bookingDate, "PENDING", price, notes);
        booking.setTimeSlot(timeSlot);
        booking.setVehicleNo(vehicleNo);
        booking.setVehicleType(vehicleType);
        booking.setDescription(description);
        booking.setTotalPrice(price);
        
        bookingRepository.save(booking);

        return ResponseEntity.ok(Map.of("message", "Booking requested successfully"));
    }

    private String extractServiceType(String description) {
        if (description == null || description.isEmpty()) {
            return "General Service";
        }
        if (description.contains("Selected Services: [") && description.contains("]")) {
            int start = description.indexOf("[") + 1;
            int end = description.indexOf("]");
            if (end > start) {
                String services = description.substring(start, end).trim();
                if (!services.isEmpty()) {
                    return services;
                }
            }
        }
        return "General Service";
    }

    private Double parsePrice(Map<String, Object> payload) {
        Object priceVal = payload.get("totalPrice") != null ? payload.get("totalPrice") : payload.get("price");
        if (priceVal == null || priceVal.toString().isEmpty()) {
            return 0.0;
        }
        try {
            return Double.parseDouble(priceVal.toString());
        } catch (Exception e) {
            return 0.0;
        }
    }

    private LocalDateTime parseDateTime(String dateStr, String timeSlot) {
        try {
            int hour = 9;
            int minute = 0;
            if (timeSlot != null && !timeSlot.isEmpty()) {
                String timePart = timeSlot.split("-")[0].trim();
                String[] parts = timePart.split(" ");
                String time = parts[0];
                String ampm = parts[1];
                
                String[] hm = time.split(":");
                hour = Integer.parseInt(hm[0]);
                minute = Integer.parseInt(hm[1]);
                if ("PM".equalsIgnoreCase(ampm) && hour < 12) {
                    hour += 12;
                } else if ("AM".equalsIgnoreCase(ampm) && hour == 12) {
                    hour = 0;
                }
            }
            java.time.LocalDate date = java.time.LocalDate.parse(dateStr);
            return date.atTime(hour, minute);
        } catch (Exception e) {
            try {
                return LocalDateTime.parse(dateStr);
            } catch (Exception ex) {
                return LocalDateTime.now();
            }
        }
    }

    // Get bookings for logged-in user (Customer, Garage, or Admin)
    @GetMapping("/my")
    public ResponseEntity<?> getMyBookings(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        if ("CUSTOMER".equals(user.getRole())) {
            Optional<Customer> customerOpt = customerRepository.findByUserId(user.getId());
            if (customerOpt.isPresent()) {
                List<Booking> bookings = bookingRepository.findByCustomerIdOrderByBookingDateDesc(customerOpt.get().getId());
                return ResponseEntity.ok(bookings);
            }
        } else if ("GARAGE_OWNER".equals(user.getRole())) {
            List<Garage> garages = garageRepository.findByUserId(user.getId());
            if (!garages.isEmpty()) {
                List<Long> garageIds = garages.stream().map(Garage::getId).toList();
                List<Booking> bookings = bookingRepository.findByGarageIdInOrderByBookingDateDesc(garageIds);
                return ResponseEntity.ok(bookings);
            }
            return ResponseEntity.ok(List.of());
        } else if ("ADMIN".equals(user.getRole())) {
            List<Booking> bookings = bookingRepository.findAll();
            return ResponseEntity.ok(bookings);
        }

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid profile or role"));
    }

    // Update booking status
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateBookingStatus(@PathVariable Long id, @RequestBody Map<String, Object> payload, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Booking booking = bookingOpt.get();
        String newStatus = payload.get("status") != null ? payload.get("status").toString() : null; // PENDING, CONFIRMED, COMPLETED, CANCELLED

        // Authorization checks
        boolean authorized = false;

        if ("ADMIN".equals(user.getRole())) {
            authorized = true;
        } else if ("CUSTOMER".equals(user.getRole())) {
            // Customer can only cancel bookings
            Optional<Customer> customerOpt = customerRepository.findByUserId(user.getId());
            if (customerOpt.isPresent() && booking.getCustomer().getId().equals(customerOpt.get().getId())) {
                if ("CANCELLED".equals(newStatus)) {
                    authorized = true;
                } else {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Customers can only cancel bookings."));
                }
            }
        } else if ("GARAGE_OWNER".equals(user.getRole())) {
            // Garage owner can confirm, complete or cancel bookings matching their garage
            List<Garage> garages = garageRepository.findByUserId(user.getId());
            authorized = garages.stream().anyMatch(g -> g.getId().equals(booking.getGarage().getId()));
        }

        if (!authorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied to update booking status"));
        }

        booking.setStatus(newStatus);
        bookingRepository.save(booking);

        return ResponseEntity.ok(Map.of("message", "Booking status updated to " + newStatus));
    }
}
