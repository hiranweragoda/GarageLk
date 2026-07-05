package com.garagefinder.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Sends an email asynchronously.
     *
     * @param to      Recipient email address.
     * @param subject Email subject.
     * @param htmlBody   Email body formatted in HTML.
     */
    public void sendEmailAsync(String to, String subject, String htmlBody) {
        if (to == null || to.isBlank()) {
            logger.warn("Skipping sending email because recipient address is empty.");
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

                helper.setFrom("hiranonline365@gmail.com", "GarageLK Support");
                helper.setTo(to.trim());
                helper.setSubject(subject);
                helper.setText(htmlBody, true); // true sets content type to html

                mailSender.send(message);
                logger.info("Successfully sent email notification to {}", to);
            } catch (Exception e) {
                logger.error("Failed to send email notification to {}: {}", to, e.getMessage(), e);
            }
        });
    }

    /**
     * Helper to wrap a plain message into a premium-styled HTML template.
     */
    public String buildNotificationHtml(String recipientName, String messageContent) {
        String name = (recipientName != null && !recipientName.isBlank()) ? recipientName : "Valued User";
        return "<!DOCTYPE html>\n" +
                "<html>\n" +
                "<head>\n" +
                "    <meta charset=\"utf-8\">\n" +
                "    <style>\n" +
                "        body { font-family: 'Outfit', 'Inter', 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6; color: #1f2937; margin: 0; padding: 0; }\n" +
                "        .wrapper { background-color: #f3f4f6; padding: 30px 15px; }\n" +
                "        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; }\n" +
                "        .header { background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: #ffffff; padding: 35px 25px; text-align: center; }\n" +
                "        .logo { font-size: 26px; font-weight: 800; margin: 0; letter-spacing: 0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.15); }\n" +
                "        .logo span { color: #facc15; }\n" +
                "        .content { padding: 40px 30px; line-height: 1.6; }\n" +
                "        .content h2 { margin-top: 0; font-size: 20px; color: #1e3a8a; font-weight: 700; }\n" +
                "        .message-box { background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 4px; margin: 25px 0; color: #334155; font-size: 15px; font-style: italic; }\n" +
                "        .btn-container { text-align: center; margin-top: 30px; }\n" +
                "        .btn { display: inline-block; padding: 12px 28px; background-color: #3b82f6; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; box-shadow: 0 2px 5px rgba(59, 130, 246, 0.3); transition: all 0.2s ease; }\n" +
                "        .footer { background-color: #f9fafb; padding: 25px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }\n" +
                "        .footer p { margin: 5px 0; }\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class=\"wrapper\">\n" +
                "        <div class=\"container\">\n" +
                "            <div class=\"header\">\n" +
                "                <div class=\"logo\">Garage<span>LK</span></div>\n" +
                "            </div>\n" +
                "            <div class=\"content\">\n" +
                "                <h2>Hello " + name + ",</h2>\n" +
                "                <p>You have received a new update regarding your account activities or bookings from GarageLK.</p>\n" +
                "                <div class=\"message-box\">\n" +
                "                    \"" + messageContent + "\"\n" +
                "                </div>\n" +
                "                <div class=\"btn-container\">\n" +
                "                    <a href=\"http://localhost:8080/dashboard.html\" class=\"btn\">Go to Dashboard</a>\n" +
                "                </div>\n" +
                "            </div>\n" +
                "            <div class=\"footer\">\n" +
                "                <p>This is an automated system notification. Please do not reply to this email.</p>\n" +
                "                <p>&copy; 2026 GarageLK. All rights reserved.</p>\n" +
                "            </div>\n" +
                "        </div>\n" +
                "    </div>\n" +
                "</body>\n" +
                "</html>";
    }

    /**
     * Helper to wrap a custom broadcast or email into a premium styled layout.
     */
    public String buildCustomEmailHtml(String recipientName, String subject, String messageContent) {
        String name = (recipientName != null && !recipientName.isBlank()) ? recipientName : "Valued User";
        return "<!DOCTYPE html>\n" +
                "<html>\n" +
                "<head>\n" +
                "    <meta charset=\"utf-8\">\n" +
                "    <style>\n" +
                "        body { font-family: 'Outfit', 'Inter', 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6; color: #1f2937; margin: 0; padding: 0; }\n" +
                "        .wrapper { background-color: #f3f4f6; padding: 30px 15px; }\n" +
                "        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; }\n" +
                "        .header { background: linear-gradient(135deg, #111827, #1f2937); color: #ffffff; padding: 35px 25px; text-align: center; }\n" +
                "        .logo { font-size: 26px; font-weight: 800; margin: 0; letter-spacing: 0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.15); }\n" +
                "        .logo span { color: #3b82f6; }\n" +
                "        .content { padding: 40px 30px; line-height: 1.6; }\n" +
                "        .content h2 { margin-top: 0; font-size: 20px; color: #111827; font-weight: 700; }\n" +
                "        .message-content { color: #374151; font-size: 15px; margin: 20px 0; white-space: pre-line; }\n" +
                "        .btn-container { text-align: center; margin-top: 30px; }\n" +
                "        .btn { display: inline-block; padding: 12px 28px; background-color: #1f2937; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2); transition: all 0.2s ease; }\n" +
                "        .footer { background-color: #f9fafb; padding: 25px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }\n" +
                "        .footer p { margin: 5px 0; }\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class=\"wrapper\">\n" +
                "        <div class=\"container\">\n" +
                "            <div class=\"header\">\n" +
                "                <div class=\"logo\">Garage<span>LK</span> Support</div>\n" +
                "            </div>\n" +
                "            <div class=\"content\">\n" +
                "                <h2>Hello " + name + ",</h2>\n" +
                "                <p style=\"font-size: 14px; color: #6b7280;\">Administrative Message: <strong>" + subject + "</strong></p>\n" +
                "                <div class=\"message-content\">\n" +
                "                    " + messageContent + "\n" +
                "                </div>\n" +
                "                <div class=\"btn-container\">\n" +
                "                    <a href=\"http://localhost:8080/index.html\" class=\"btn\">Visit GarageLK</a>\n" +
                "                </div>\n" +
                "            </div>\n" +
                "            <div class=\"footer\">\n" +
                "                <p>This is an administrative email notification sent to registered users of GarageLK.</p>\n" +
                "                <p>&copy; 2026 GarageLK. All rights reserved.</p>\n" +
                "            </div>\n" +
                "        </div>\n" +
                "    </div>\n" +
                "</body>\n" +
                "</html>";
    }

    /**
     * Helper to wrap a welcome notification into a premium styled layout.
     */
    public String buildWelcomeEmailHtml(String recipientName, String role) {
        String name = (recipientName != null && !recipientName.isBlank()) ? recipientName : "Valued User";
        String displayRole = (role != null) ? role.replace("_", " ").toLowerCase() : "user";
        return "<!DOCTYPE html>\n" +
                "<html>\n" +
                "<head>\n" +
                "    <meta charset=\"utf-8\">\n" +
                "    <style>\n" +
                "        body { font-family: 'Outfit', 'Inter', 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6; color: #1f2937; margin: 0; padding: 0; }\n" +
                "        .wrapper { background-color: #f3f4f6; padding: 30px 15px; }\n" +
                "        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; }\n" +
                "        .header { background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: #ffffff; padding: 40px 25px; text-align: center; }\n" +
                "        .logo { font-size: 28px; font-weight: 800; margin: 0; letter-spacing: 0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.15); }\n" +
                "        .logo span { color: #facc15; }\n" +
                "        .content { padding: 40px 30px; line-height: 1.6; }\n" +
                "        .content h2 { margin-top: 0; font-size: 22px; color: #1e3a8a; font-weight: 700; }\n" +
                "        .welcome-badge { display: inline-block; padding: 6px 16px; background-color: rgba(59, 130, 246, 0.1); color: #3b82f6; border-radius: 20px; font-weight: 600; font-size: 14px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px; }\n" +
                "        .feature-item { margin-bottom: 12px; display: block; }\n" +
                "        .feature-bullet { color: #3b82f6; font-weight: bold; margin-right: 8px; font-size: 16px; }\n" +
                "        .feature-text { font-size: 14.5px; color: #4b5563; }\n" +
                "        .btn-container { text-align: center; margin-top: 35px; }\n" +
                "        .btn { display: inline-block; padding: 12px 28px; background-color: #3b82f6; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; box-shadow: 0 2px 5px rgba(59, 130, 246, 0.3); }\n" +
                "        .footer { background-color: #f9fafb; padding: 25px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }\n" +
                "        .footer p { margin: 5px 0; }\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class=\"wrapper\">\n" +
                "        <div class=\"container\">\n" +
                "            <div class=\"header\">\n" +
                "                <div class=\"logo\">Garage<span>LK</span></div>\n" +
                "            </div>\n" +
                "            <div class=\"content\">\n" +
                "                <h2>Welcome to GarageLK!</h2>\n" +
                "                <div class=\"welcome-badge\">Registered as " + displayRole + "</div>\n" +
                "                <p>Hello " + name + ",</p>\n" +
                "                <p>Thank you for registering at GarageLK. Your account has been successfully created and is ready to use.</p>\n" +
                "                <p>Here are some of the features you can explore on our platform:</p>\n" +
                "                \n" +
                "                <div class=\"feature-item\">\n" +
                "                    <span class=\"feature-bullet\">&bull;</span>\n" +
                "                    <span class=\"feature-text\">Search for verified vehicle garages, repair shops, and spare part sellers.</span>\n" +
                "                </div>\n" +
                "                <div class=\"feature-item\">\n" +
                "                    <span class=\"feature-bullet\">&bull;</span>\n" +
                "                    <span class=\"feature-text\">File emergency breakdown assistance requests to receive stranded vehicle help instantly.</span>\n" +
                "                </div>\n" +
                "                <div class=\"feature-item\">\n" +
                "                    <span class=\"feature-bullet\">&bull;</span>\n" +
                "                    <span class=\"feature-text\">Schedule and manage appointments with mechanic garages online.</span>\n" +
                "                </div>\n" +
                "                \n" +
                "                <div class=\"btn-container\">\n" +
                "                    <a href=\"http://localhost:8080/dashboard.html\" class=\"btn\">Access Dashboard</a>\n" +
                "                </div>\n" +
                "            </div>\n" +
                "            <div class=\"footer\">\n" +
                "                <p>You received this email because you registered on GarageLK.</p>\n" +
                "                <p>&copy; 2026 GarageLK. All rights reserved.</p>\n" +
                "            </div>\n" +
                "        </div>\n" +
                "    </div>\n" +
                "</body>\n" +
                "</html>";
    }
}
