package com.garagefinder.controller;

import com.garagefinder.model.*;
import com.garagefinder.repository.*;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/shop-reviews")
public class ShopReviewController {

    private final ShopReviewRepository reviewRepository;
    private final SparePartBookingRepository bookingRepository;

    public ShopReviewController(
            ShopReviewRepository reviewRepository,
            SparePartBookingRepository bookingRepository) {
        this.reviewRepository = reviewRepository;
        this.bookingRepository = bookingRepository;
    }

    // Submit a review for a shop (Customer only, for a PICKED_UP booking)
    @PostMapping
    public ResponseEntity<?> submitShopReview(@RequestBody Map<String, Object> payload, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"CUSTOMER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Only customers can submit shop reviews"));
        }

        if (payload.get("bookingId") == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "bookingId is required"));
        }
        Long bookingId = Long.parseLong(payload.get("bookingId").toString());
        Optional<SparePartBooking> bookingOpt = bookingRepository.findById(bookingId);
        if (bookingOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Reservation not found"));
        }

        SparePartBooking booking = bookingOpt.get();

        // Only PICKED_UP reservations can be reviewed
        if (!"PICKED_UP".equals(booking.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "You can only review spare part shops for picked up orders"));
        }

        // Ensure this customer owns this booking
        if (!booking.getCustomer().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        // One review per reservation
        if (reviewRepository.existsBySparePartBookingId(bookingId)) {
            return ResponseEntity.badRequest().body(Map.of("message", "You have already reviewed this purchase"));
        }

        Object ratingVal = payload.get("rating") != null ? payload.get("rating") : payload.get("starRating");
        if (ratingVal == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Star rating is required"));
        }
        String ratingStr = ratingVal.toString();
        int starRating = (int) Double.parseDouble(ratingStr);
        if (starRating < 1 || starRating > 5) {
            return ResponseEntity.badRequest().body(Map.of("message", "Star rating must be between 1 and 5"));
        }

        String comment = payload.get("comment") != null ? payload.get("comment").toString().trim() : "";

        ShopReview review = new ShopReview(user, booking.getSparePart().getShop(), booking, starRating, comment);
        reviewRepository.save(review);

        return ResponseEntity.ok(Map.of("message", "Shop review submitted successfully!"));
    }

    // Get all reviews for a specific shop (public)
    @GetMapping("/shop/{shopId}")
    public ResponseEntity<?> getShopReviews(@PathVariable Long shopId) {
        List<ShopReview> reviews = reviewRepository.findByShopIdOrderByCreatedAtDesc(shopId);

        List<Map<String, Object>> result = new ArrayList<>();
        for (ShopReview r : reviews) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", r.getId());
            item.put("starRating", r.getStarRating());
            item.put("rating", r.getStarRating());
            item.put("comment", r.getComment());
            item.put("createdAt", r.getCreatedAt());
            item.put("customerName", r.getCustomer().getUsername());
            item.put("partName", r.getSparePartBooking().getSparePart().getPartName());
            result.add(item);
        }

        return ResponseEntity.ok(result);
    }

    // Check if a specific booking has already been reviewed
    @GetMapping("/booking/{bookingId}/exists")
    public ResponseEntity<?> reviewExistsForBooking(@PathVariable Long bookingId, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        return ResponseEntity.ok(Map.of("exists", reviewRepository.existsBySparePartBookingId(bookingId)));
    }
}
