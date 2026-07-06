package com.garagefinder.controller;

import com.garagefinder.model.Notification;
import com.garagefinder.model.User;
import com.garagefinder.service.NotificationService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyNotifications(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<Notification> notifications = notificationService.findByUserIdOrderByCreatedAtDesc(user.getId());
        long unreadCount = notificationService.countByUserIdAndIsRead(user.getId(), false);

        return ResponseEntity.ok(Map.of(
            "notifications", notifications,
            "unreadCount", unreadCount
        ));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<Notification> notifOpt = notificationService.findById(id);
        if (notifOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Notification notif = notifOpt.get();
        if (!notif.getUserId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        notif.setRead(true);
        notificationService.save(notif);

        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    @PostMapping("/mark-all-read")
    @Transactional
    public ResponseEntity<?> markAllAsRead(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<Notification> notifications = notificationService.findByUserIdOrderByCreatedAtDesc(user.getId());
        for (Notification n : notifications) {
            if (!n.isRead()) {
                n.setRead(true);
                notificationService.save(n);
            }
        }

        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    @PostMapping("/clear")
    @Transactional
    public ResponseEntity<?> clearNotifications(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<Notification> notifications = notificationService.findByUserIdOrderByCreatedAtDesc(user.getId());
        notificationService.deleteAll(notifications);

        return ResponseEntity.ok(Map.of("message", "All notifications cleared"));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteNotification(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<Notification> notifOpt = notificationService.findById(id);
        if (notifOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Notification notif = notifOpt.get();
        if (!notif.getUserId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        notificationService.delete(notif);
        return ResponseEntity.ok(Map.of("message", "Notification deleted successfully"));
    }
}
