package com.garagefinder.service;

import com.garagefinder.model.Notification;
import com.garagefinder.model.User;
import com.garagefinder.repository.NotificationRepository;
import com.garagefinder.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               EmailService emailService) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    /**
     * Saves a notification, and if it's a brand new notification, automatically sends an email notification to the user.
     */
    public Notification save(Notification notification) {
        boolean isNew = (notification.getId() == null);
        Notification saved = notificationRepository.save(notification);

        if (isNew) {
            try {
                Optional<User> userOpt = userRepository.findById(saved.getUserId());
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    if (user.getEmail() != null && !user.getEmail().isBlank()) {
                        String subject = "New Notification from GarageLK";
                        String htmlBody = emailService.buildNotificationHtml(user.getFullName(), saved.getMessage());
                        emailService.sendEmailAsync(user.getEmail(), subject, htmlBody);
                        logger.info("Triggered email dispatch for new notification ID {} to user {}", saved.getId(), user.getEmail());
                    } else {
                        logger.warn("Skipping email for user ID {} because email address is missing/empty", user.getId());
                    }
                } else {
                    logger.warn("Could not find user with ID {} to send email notification", saved.getUserId());
                }
            } catch (Exception e) {
                // Log and absorb exception so notification creation doesn't fail main business transactions
                logger.error("Error triggering email for notification ID {}: {}", saved.getId(), e.getMessage(), e);
            }
        }

        return saved;
    }

    // Delegates to repository for query operations
    public List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long countByUserIdAndIsRead(Long userId, boolean isRead) {
        return notificationRepository.countByUserIdAndIsRead(userId, isRead);
    }

    public Optional<Notification> findById(Long id) {
        return notificationRepository.findById(id);
    }

    public void deleteAll(List<Notification> notifications) {
        notificationRepository.deleteAll(notifications);
    }
}
