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

        String cardNumber = null;
        String cardHolderName = null;
        String expiryDate = null;
        String cvv = null;

        if ("CARD".equals(paymentMethod)) {
            if (payload.get("cardNumber") == null || payload.get("cardHolderName") == null || payload.get("expiryDate") == null || payload.get("cvv") == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Card details (cardNumber, cardHolderName, expiryDate, cvv) are required for card payments"));
            }
            cardNumber = payload.get("cardNumber").toString().replaceAll("\\s+", "");
            cardHolderName = payload.get("cardHolderName").toString();
            expiryDate = payload.get("expiryDate").toString();
            cvv = payload.get("cvv").toString();

            // Mock Card Validation
            if (cardNumber.length() < 12 || cardNumber.length() > 19) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid card number length"));
            }
            if (cvv.length() < 3 || cvv.length() > 4) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid CVV"));
            }
        }

        Payment payment = new Payment(bookingId, bookingType, amount, paymentMethod, cardNumber, cardHolderName, expiryDate, cvv);
        paymentRepository.save(payment);

        return ResponseEntity.ok(Map.of(
            "message", "Payment processed successfully",
            "paymentId", payment.getId(),
            "status", "SUCCESS"
        ));
    }
}
