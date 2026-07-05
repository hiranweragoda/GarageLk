package com.garagefinder.controller;

import com.garagefinder.model.*;
import com.garagefinder.repository.*;
import com.garagefinder.util.HashUtil;
import com.garagefinder.service.EmailService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final GarageRepository garageRepository;
    private final SparePartShopRepository shopRepository;
    private final SparePartRepository partRepository;
    private final BookingRepository bookingRepository;
    private final ReviewRepository reviewRepository;
    private final BreakdownRequestRepository breakdownRequestRepository;
    private final MechanicRepository mechanicRepository;
    private final OfferedServiceRepository offeredServiceRepository;
    private final EmailService emailService;

    public AuthController(
            UserRepository userRepository,
            GarageRepository garageRepository,
            SparePartShopRepository shopRepository,
            SparePartRepository partRepository,
            BookingRepository bookingRepository,
            ReviewRepository reviewRepository,
            BreakdownRequestRepository breakdownRequestRepository,
            MechanicRepository mechanicRepository,
            OfferedServiceRepository offeredServiceRepository,
            EmailService emailService) {
        this.userRepository = userRepository;
        this.garageRepository = garageRepository;
        this.shopRepository = shopRepository;
        this.partRepository = partRepository;
        this.bookingRepository = bookingRepository;
        this.reviewRepository = reviewRepository;
        this.breakdownRequestRepository = breakdownRequestRepository;
        this.mechanicRepository = mechanicRepository;
        this.offeredServiceRepository = offeredServiceRepository;
        this.emailService = emailService;
    }

    @PostMapping("/register/customer")
    public ResponseEntity<?> registerCustomer(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");
        String fullName = payload.get("fullName");
        String phone = payload.get("phone");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }

        if (userRepository.findByEmail(email.trim()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is already registered"));
        }

        User user = new User(HashUtil.hashPassword(password), fullName, email, phone, "CUSTOMER", true);
        userRepository.save(user);

        try {
            String welcomeHtml = emailService.buildWelcomeEmailHtml(fullName, "CUSTOMER");
            emailService.sendEmailAsync(email, "Welcome to GarageLK!", welcomeHtml);
        } catch (Exception e) {
            e.printStackTrace();
        }

        return ResponseEntity.ok(Map.of("message", "Customer registered successfully"));
    }

    // Unified register endpoint used by the frontend auth form
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");
        String fullName = payload.get("fullName");
        String phone = payload.get("phone");
        String role = payload.get("role"); // "CUSTOMER" or "OWNER"

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }

        if (userRepository.findByEmail(email.trim()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is already registered"));
        }

        if ("OWNER".equalsIgnoreCase(role) || "GARAGE_OWNER".equalsIgnoreCase(role)) {
            // Garage owner: active initially so they can log in and submit their garage profile
            User user = new User(HashUtil.hashPassword(password), fullName, email, phone, "GARAGE_OWNER", true);
            userRepository.save(user);
            try {
                String welcomeHtml = emailService.buildWelcomeEmailHtml(fullName, "GARAGE_OWNER");
                emailService.sendEmailAsync(email, "Welcome to GarageLK!", welcomeHtml);
            } catch (Exception e) { e.printStackTrace(); }
            return ResponseEntity.ok(Map.of("message", "Garage owner account created. Please sign in to register your garage."));
        } else if ("SHOP_OWNER".equalsIgnoreCase(role)) {
            // Spare Part seller
            User user = new User(HashUtil.hashPassword(password), fullName, email, phone, "SHOP_OWNER", true);
            userRepository.save(user);
            try {
                String welcomeHtml = emailService.buildWelcomeEmailHtml(fullName, "SHOP_OWNER");
                emailService.sendEmailAsync(email, "Welcome to GarageLK!", welcomeHtml);
            } catch (Exception e) { e.printStackTrace(); }
            return ResponseEntity.ok(Map.of("message", "Shop owner account created. Please sign in to register your spare part shop."));
        } else {
            // Default: customer
            User user = new User(HashUtil.hashPassword(password), fullName, email, phone, "CUSTOMER", true);
            userRepository.save(user);
            try {
                String welcomeHtml = emailService.buildWelcomeEmailHtml(fullName, "CUSTOMER");
                emailService.sendEmailAsync(email, "Welcome to GarageLK!", welcomeHtml);
            } catch (Exception e) { e.printStackTrace(); }
            return ResponseEntity.ok(Map.of("message", "Account created successfully!"));
        }
    }

    @PostMapping("/register/admin")
    public ResponseEntity<?> registerAdmin(@RequestBody Map<String, String> payload, HttpSession session) {
        User loggedIn = (User) session.getAttribute("LOGGED_IN_USER");
        if (loggedIn == null || !"ADMIN".equals(loggedIn.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        String email = payload.get("email");
        String password = payload.get("password");
        String fullName = payload.get("fullName");
        String phone = payload.get("phone");

        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and password are required"));
        }

        if (userRepository.findByEmail(email.trim()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is already registered"));
        }

        User user = new User(HashUtil.hashPassword(password), fullName, email, phone, "ADMIN", true);
        userRepository.save(user);

        try {
            String welcomeHtml = emailService.buildWelcomeEmailHtml(fullName, "ADMIN");
            emailService.sendEmailAsync(email, "Welcome to GarageLK!", welcomeHtml);
        } catch (Exception e) {
            e.printStackTrace();
        }

        return ResponseEntity.ok(Map.of("message", "Admin registered successfully"));
    }

    @PostMapping("/register/garage")
    public ResponseEntity<?> registerGarage(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");
        String phone = payload.get("phone");

        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and password are required"));
        }

        if (userRepository.findByEmail(email.trim()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is already registered"));
        }

        // Garage owner: active initially so they can log in and submit their garage profile
        User user = new User(HashUtil.hashPassword(password), email, phone, "GARAGE_OWNER", true);
        userRepository.save(user);

        try {
            String welcomeHtml = emailService.buildWelcomeEmailHtml("", "GARAGE_OWNER");
            emailService.sendEmailAsync(email, "Welcome to GarageLK!", welcomeHtml);
        } catch (Exception e) {
            e.printStackTrace();
        }

        return ResponseEntity.ok(Map.of("message", "Garage owner account created. Please sign in to register your garage."));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload, HttpSession session) {
        String emailOrUsername = payload.containsKey("email") ? payload.get("email") : payload.get("username");
        String password = payload.get("password");

        Optional<User> userOpt = Optional.empty();
        if (emailOrUsername != null && !emailOrUsername.isBlank()) {
            userOpt = userRepository.findByEmail(emailOrUsername.trim());
        }

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid email or password"));
        }

        User user = userOpt.get();
        if (!user.getPassword().equals(HashUtil.hashPassword(password))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid username or password"));
        }

        if (!user.isActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Your account has been deactivated."));
        }

        session.setAttribute("LOGGED_IN_USER", user);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Login successful");
        response.put("id", user.getId());
        response.put("username", user.getEmail());
        response.put("fullName", user.getFullName() != null ? user.getFullName() : user.getEmail());
        response.put("email", user.getEmail());
        response.put("phone", user.getPhone());
        response.put("role", user.getRole());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not logged in"));
        }

        // Reload to get fresh active state
        user = userRepository.findById(user.getId()).orElse(user);

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("username", user.getEmail());
        response.put("fullName", user.getFullName() != null ? user.getFullName() : user.getEmail());
        response.put("email", user.getEmail());
        response.put("phone", user.getPhone());
        response.put("role", user.getRole());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/profile/update")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> payload, HttpSession session) {
        User loggedIn = (User) session.getAttribute("LOGGED_IN_USER");
        if (loggedIn == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not logged in"));
        }

        Optional<User> userOpt = userRepository.findById(loggedIn.getId());
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();
        String fullName = payload.get("fullName");
        String email = payload.get("email");
        String phone = payload.get("phone");
        String password = payload.get("password");

        if (email != null && !email.isBlank()) {
            Optional<User> existing = userRepository.findByEmail(email.trim());
            if (existing.isPresent() && !existing.get().getId().equals(user.getId())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Email is already registered by another account"));
            }
            user.setEmail(email.trim());
        }
        if (phone != null && !phone.isBlank()) {
            user.setPhone(phone);
        }
        if (fullName != null) {
            user.setFullName(fullName);
        }
        if (password != null && !password.isBlank()) {
            user.setPassword(HashUtil.hashPassword(password));
        }

        userRepository.save(user);

        // Update user in session
        session.setAttribute("LOGGED_IN_USER", user);

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("username", user.getEmail());
        response.put("fullName", user.getFullName() != null ? user.getFullName() : user.getEmail());
        response.put("email", user.getEmail());
        response.put("phone", user.getPhone());
        response.put("role", user.getRole());
        response.put("message", "Profile updated successfully");

        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String newPassword = payload.get("newPassword");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }
        if (newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "New password is required"));
        }
        if (newPassword.length() < 4) {
            return ResponseEntity.badRequest().body(Map.of("message", "Password must be at least 4 characters"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "No account found with that email address"));
        }

        User user = userOpt.get();
        user.setPassword(HashUtil.hashPassword(newPassword));
        userRepository.save(user);

        return ResponseEntity
                .ok(Map.of("message", "Password has been reset successfully. Please sign in with your new password."));
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        return ResponseEntity.ok(userRepository.findAll());
    }

    @DeleteMapping("/users/{userId}")
    @Transactional
    public ResponseEntity<?> deleteUser(@PathVariable Long userId, HttpSession session) {
        User loggedIn = (User) session.getAttribute("LOGGED_IN_USER");
        if (loggedIn == null || !"ADMIN".equals(loggedIn.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        if (loggedIn.getId().equals(userId)) {
            return ResponseEntity.badRequest().body(Map.of("message", "You cannot delete your own admin account."));
        }

        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();

        // 1. GARAGE_OWNER cleanup
        List<Garage> garages = garageRepository.findByUserId(userId);
        for (Garage g : garages) {
            // Delete associated mechanics
            List<Mechanic> mechanics = mechanicRepository.findByGarageId(g.getId());
            mechanicRepository.deleteAll(mechanics);
            // Delete associated services
            offeredServiceRepository.deleteByGarageId(g.getId());
            // Delete associated reviews
            List<Review> reviews = reviewRepository.findByGarageIdOrderByCreatedAtDesc(g.getId());
            reviewRepository.deleteAll(reviews);
            // Delete associated bookings
            List<Booking> bookings = bookingRepository.findByGarageId(g.getId());
            bookingRepository.deleteAll(bookings);
            List<BreakdownRequest> breakdowns = breakdownRequestRepository.findByAssignedGarageId(g.getId());
            for (BreakdownRequest br : breakdowns) {
                br.setAssignedGarage(null);
                br.setAssignedMechanic(null);
                if ("ACCEPTED".equals(br.getStatus())) {
                    br.setStatus("OPEN");
                }
                breakdownRequestRepository.save(br);
            }
            garageRepository.delete(g);
        }

        // 2. SHOP_OWNER cleanup
        List<SparePartShop> shops = shopRepository.findByUserId(userId);
        for (SparePartShop s : shops) {
            // Delete parts
            List<SparePart> parts = partRepository.findByShopId(s.getId());
            partRepository.deleteAll(parts);
            // Delete shop
            shopRepository.delete(s);
        }

        // 3. CUSTOMER cleanup — delete bookings, reviews, breakdown requests directly
        // by user id
        List<Review> customerReviews = reviewRepository.findByCustomerId(userId);
        reviewRepository.deleteAll(customerReviews);

        List<Booking> customerBookings = bookingRepository.findByCustomerIdOrderByBookingDateDesc(userId);
        bookingRepository.deleteAll(customerBookings);

        List<BreakdownRequest> customerBreakdowns = breakdownRequestRepository
                .findByCustomerIdOrderByCreatedTimeDesc(userId);
        breakdownRequestRepository.deleteAll(customerBreakdowns);

        // Finally, delete the user
        userRepository.delete(user);

        return ResponseEntity.ok(Map.of("message", "User and all associated data deleted successfully"));
    }
}
