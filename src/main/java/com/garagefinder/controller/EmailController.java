package com.garagefinder.controller;

import com.garagefinder.model.User;
import com.garagefinder.repository.UserRepository;
import com.garagefinder.service.EmailService;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/email")
public class EmailController {

    private static final Logger logger = LoggerFactory.getLogger(EmailController.class);

    private final UserRepository userRepository;
    private final EmailService emailService;

    public EmailController(UserRepository userRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    /**
     * Sends custom administrative email(s). Accessible only to administrators.
     */
    @PostMapping("/send")
    public ResponseEntity<?> sendCustomEmail(@RequestBody Map<String, Object> payload, HttpSession session) {
        User loggedInUser = (User) session.getAttribute("LOGGED_IN_USER");
        if (loggedInUser == null || !"ADMIN".equals(loggedInUser.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized. Administrative access required."));
        }

        String recipientType = (String) payload.get("recipientType");
        String subject = (String) payload.get("subject");
        String body = (String) payload.get("body");

        if (recipientType == null || recipientType.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "recipientType is required"));
        }
        if (subject == null || subject.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "subject is required"));
        }
        if (body == null || body.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "body is required"));
        }

        int count = 0;

        try {
            if ("INDIVIDUAL".equalsIgnoreCase(recipientType)) {
                Object recipientIdObj = payload.get("recipientId");
                if (recipientIdObj == null) {
                    return ResponseEntity.badRequest().body(Map.of("message", "recipientId is required for INDIVIDUAL recipientType"));
                }
                Long recipientId = Long.valueOf(recipientIdObj.toString());
                Optional<User> targetOpt = userRepository.findById(recipientId);
                if (targetOpt.isEmpty()) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Target user not found"));
                }
                User targetUser = targetOpt.get();
                if (targetUser.getEmail() == null || targetUser.getEmail().isBlank()) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Target user does not have a registered email address"));
                }
                String html = emailService.buildCustomEmailHtml(targetUser.getFullName(), subject, body);
                emailService.sendEmailAsync(targetUser.getEmail(), subject, html);
                count = 1;
            } else if ("ROLE".equalsIgnoreCase(recipientType)) {
                String role = (String) payload.get("role");
                if (role == null || role.isBlank()) {
                    return ResponseEntity.badRequest().body(Map.of("message", "role is required for ROLE recipientType"));
                }
                List<User> users = userRepository.findAll().stream()
                        .filter(u -> role.equalsIgnoreCase(u.getRole()))
                        .toList();
                for (User u : users) {
                    if (u.getEmail() != null && !u.getEmail().isBlank()) {
                        String html = emailService.buildCustomEmailHtml(u.getFullName(), subject, body);
                        emailService.sendEmailAsync(u.getEmail(), subject, html);
                        count++;
                    }
                }
            } else if ("ALL".equalsIgnoreCase(recipientType)) {
                List<User> users = userRepository.findAll();
                for (User u : users) {
                    if (u.getEmail() != null && !u.getEmail().isBlank()) {
                        String html = emailService.buildCustomEmailHtml(u.getFullName(), subject, body);
                        emailService.sendEmailAsync(u.getEmail(), subject, html);
                        count++;
                    }
                }
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid recipientType. Must be INDIVIDUAL, ROLE, or ALL"));
            }
        } catch (Exception e) {
            logger.error("Error preparing emails: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to dispatch emails: " + e.getMessage()));
        }

        return ResponseEntity.ok(Map.of(
                "message", String.format("Successfully initiated sending %d email(s) in the background.", count),
                "count", count
        ));
    }
}
