package com.garagefinder.controller;

import com.garagefinder.model.Payment;
import com.garagefinder.model.User;
import com.garagefinder.repository.PaymentRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentRepository paymentRepository;

    public PaymentController(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    @PostMapping
    public ResponseEntity<?> processPayment(@RequestBody Map<String, Object> payload, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        if (payload.get("bookingId") == null || payload.get("bookingType") == null || payload.get("amount") == null || payload.get("paymentMethod") == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "bookingId, bookingType, amount, and paymentMethod are required"));
        }

        Long bookingId = Long.parseLong(payload.get("bookingId").toString());
        String bookingType = payload.get("bookingType").toString();
        Double amount = Double.parseDouble(payload.get("amount").toString());
        String paymentMethod = payload.get("paymentMethod").toString().toUpperCase();

        if ("CARD".equals(paymentMethod)) {
            if (payload.get("cardFirst4") == null || payload.get("cardLast4") == null || payload.get("expiryDate") == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Card details (cardFirst4, cardLast4, expiryDate) are required for card payments"));
            }
            String cardFirst4 = payload.get("cardFirst4").toString().trim();
            String cardLast4 = payload.get("cardLast4").toString().trim();

            // Mock Card Validation
            if (cardFirst4.length() != 4 || cardLast4.length() != 4) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "First and last digits of card must be exactly 4 digits"));
            }
        }

        // Save only payment statistics (no card details saved)
        Payment payment = new Payment(bookingId, bookingType, amount, paymentMethod);
        paymentRepository.save(payment);

        return ResponseEntity.ok(Map.of(
            "message", "Payment processed successfully",
            "paymentId", payment.getId(),
            "status", "SUCCESS"
        ));
    }
}
