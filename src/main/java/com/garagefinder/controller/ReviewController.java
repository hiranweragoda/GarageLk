package com.garagefinder.controller;

import com.garagefinder.model.Booking;
import com.garagefinder.model.BreakdownRequest;
import com.garagefinder.model.Garage;
import com.garagefinder.model.Review;
import com.garagefinder.model.User;
import com.garagefinder.repository.BookingRepository;
import com.garagefinder.repository.BreakdownRequestRepository;
import com.garagefinder.repository.ReviewRepository;
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
    private final BreakdownRequestRepository breakdownRequestRepository;

    public ReviewController(ReviewRepository reviewRepository, BookingRepository bookingRepository, BreakdownRequestRepository breakdownRequestRepository) {
        this.reviewRepository = reviewRepository;
        this.bookingRepository = bookingRepository;
        this.breakdownRequestRepository = breakdownRequestRepository;
    }

    // Submit a review (Customer only, for a COMPLETED booking, one per booking)
    @PostMapping
    public ResponseEntity<?> submitReview(@RequestBody Map<String, Object> payload, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"CUSTOMER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Only customers can submit reviews"));
        }

        Long bookingId = null;
        Long breakdownRequestId = null;

        if (payload.containsKey("bookingId") && payload.get("bookingId") != null && !payload.get("bookingId").toString().isEmpty()) {
            bookingId = Long.parseLong(payload.get("bookingId").toString());
        }
        if (payload.containsKey("breakdownRequestId") && payload.get("breakdownRequestId") != null && !payload.get("breakdownRequestId").toString().isEmpty()) {
            breakdownRequestId = Long.parseLong(payload.get("breakdownRequestId").toString());
        }

        if (bookingId == null && breakdownRequestId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Either bookingId or breakdownRequestId is required"));
        }

        Garage garage = null;
        Booking booking = null;
        BreakdownRequest breakdownRequest = null;

        if (bookingId != null) {
            Optional<Booking> bookingOpt = bookingRepository.findById(bookingId);
            if (bookingOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Booking not found"));
            }
            booking = bookingOpt.get();
            if (!"COMPLETED".equals(booking.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("message", "You can only review completed services"));
            }
            if (!booking.getCustomer().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
            }
            if (reviewRepository.existsByBookingId(bookingId)) {
                return ResponseEntity.badRequest().body(Map.of("message", "You have already reviewed this service"));
            }
            garage = booking.getGarage();
        } else {
            Optional<BreakdownRequest> requestOpt = breakdownRequestRepository.findById(breakdownRequestId);
            if (requestOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Emergency request not found"));
            }
            breakdownRequest = requestOpt.get();
            if (!"COMPLETED".equals(breakdownRequest.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("message", "You can only review completed rescues"));
            }
            if (!breakdownRequest.getCustomer().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
            }
            if (reviewRepository.existsByBreakdownRequestId(breakdownRequestId)) {
                return ResponseEntity.badRequest().body(Map.of("message", "You have already reviewed this rescue"));
            }
            garage = breakdownRequest.getAssignedGarage();
            if (garage == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "No garage responded to this emergency"));
            }
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

        Review review;
        if (booking != null) {
            review = new Review(user, garage, booking, starRating, comment);
        } else {
            review = new Review(user, garage, breakdownRequest, starRating, comment);
        }
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
            item.put("customerName", r.getCustomer().getUsername());
            item.put("vehicleType", null); // vehicle info no longer stored in customers table
            item.put("serviceType", r.getBooking() != null ? r.getBooking().getServiceType() : "Emergency Rescue");
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

    // Check if a specific breakdown request has already been reviewed
    @GetMapping("/breakdown/{requestId}/exists")
    public ResponseEntity<?> reviewExistsForBreakdown(@PathVariable Long requestId, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        return ResponseEntity.ok(Map.of("exists", reviewRepository.existsByBreakdownRequestId(requestId)));
    }
}
