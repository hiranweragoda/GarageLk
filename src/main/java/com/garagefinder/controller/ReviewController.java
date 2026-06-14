package com.garagefinder.controller;

import com.garagefinder.model.*;
import com.garagefinder.repository.*;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final CustomerRepository customerRepository;

    public ReviewController(ReviewRepository reviewRepository, BookingRepository bookingRepository, CustomerRepository customerRepository) {
        this.reviewRepository = reviewRepository;
        this.bookingRepository = bookingRepository;
        this.customerRepository = customerRepository;
    }

    // Submit a review (Customer only, for a COMPLETED booking, one per booking)
    @PostMapping
    public ResponseEntity<?> submitReview(@RequestBody Map<String, Object> payload, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"CUSTOMER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Only customers can submit reviews"));
        }

        Optional<Customer> customerOpt = customerRepository.findByUserId(user.getId());
        if (customerOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Customer profile not found"));
        }

        if (payload.get("bookingId") == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "bookingId is required"));
        }
        Long bookingId = Long.parseLong(payload.get("bookingId").toString());
        Optional<Booking> bookingOpt = bookingRepository.findById(bookingId);
        if (bookingOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Booking not found"));
        }

        Booking booking = bookingOpt.get();

        // Only COMPLETED bookings can be reviewed
        if (!"COMPLETED".equals(booking.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "You can only review completed services"));
        }

        // Ensure this customer owns this booking
        if (!booking.getCustomer().getId().equals(customerOpt.get().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        // One review per booking
        if (reviewRepository.existsByBookingId(bookingId)) {
            return ResponseEntity.badRequest().body(Map.of("message", "You have already reviewed this service"));
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

        Review review = new Review(customerOpt.get(), booking.getGarage(), booking, starRating, comment);
        reviewRepository.save(review);

        return ResponseEntity.ok(Map.of("message", "Review submitted successfully! Thank you for your feedback."));
    }

    // Get all reviews for a specific garage (public)
    @GetMapping("/garage/{garageId}")
    public ResponseEntity<?> getGarageReviews(@PathVariable Long garageId) {
        List<Review> reviews = reviewRepository.findByGarageIdOrderByCreatedAtDesc(garageId);

        List<Map<String, Object>> result = new ArrayList<>();
        for (Review r : reviews) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", r.getId());
            item.put("starRating", r.getStarRating());
            item.put("rating", r.getStarRating());
            item.put("comment", r.getComment());
            item.put("createdAt", r.getCreatedAt());
            item.put("customerName", r.getCustomer().getUser().getUsername());
            item.put("vehicleType", r.getCustomer().getVehicleType());
            item.put("serviceType", r.getBooking().getServiceType());
            result.add(item);
        }

        return ResponseEntity.ok(result);
    }

    // Get average rating and count for a garage (public)
    @GetMapping("/garage/{garageId}/summary")
    public ResponseEntity<?> getGarageRatingSummary(@PathVariable Long garageId) {
        Double avg = reviewRepository.findAverageRatingByGarageId(garageId);
        Long count = reviewRepository.countByGarageId(garageId);

        Map<String, Object> summary = new HashMap<>();
        summary.put("averageRating", avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0);
        summary.put("totalReviews", count);

        return ResponseEntity.ok(summary);
    }

    // Check if a specific booking has already been reviewed
    @GetMapping("/booking/{bookingId}/exists")
    public ResponseEntity<?> reviewExistsForBooking(@PathVariable Long bookingId, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        return ResponseEntity.ok(Map.of("exists", reviewRepository.existsByBookingId(bookingId)));
    }
}
