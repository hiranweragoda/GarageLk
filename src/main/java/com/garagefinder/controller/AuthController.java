package com.garagefinder.controller;

import com.garagefinder.model.*;
import com.garagefinder.repository.*;
import com.garagefinder.util.HashUtil;
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
    private final CustomerRepository customerRepository;
    private final GarageRepository garageRepository;
    private final SparePartShopRepository shopRepository;
    private final SparePartRepository partRepository;
    private final BookingRepository bookingRepository;
    private final ReviewRepository reviewRepository;
    private final BreakdownRequestRepository breakdownRequestRepository;
    private final MechanicRepository mechanicRepository;
    private final OfferedServiceRepository offeredServiceRepository;

    public AuthController(
            UserRepository userRepository,
            CustomerRepository customerRepository,
            GarageRepository garageRepository,
            SparePartShopRepository shopRepository,
            SparePartRepository partRepository,
            BookingRepository bookingRepository,
            ReviewRepository reviewRepository,
            BreakdownRequestRepository breakdownRequestRepository,
            MechanicRepository mechanicRepository,
            OfferedServiceRepository offeredServiceRepository) {
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.garageRepository = garageRepository;
        this.shopRepository = shopRepository;
        this.partRepository = partRepository;
        this.bookingRepository = bookingRepository;
        this.reviewRepository = reviewRepository;
        this.breakdownRequestRepository = breakdownRequestRepository;
        this.mechanicRepository = mechanicRepository;
        this.offeredServiceRepository = offeredServiceRepository;
    }

    @PostMapping("/register/customer")
    public ResponseEntity<?> registerCustomer(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String password = payload.get("password");
        String fullName = payload.get("fullName");
        String email = payload.get("email");
        String phone = payload.get("phone");
        String vehicleNo = payload.get("vehicleNo");
        String vehicleType = payload.get("vehicleType");
        String fuelType = payload.get("fuelType");

        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username is already taken"));
        }

        User user = new User(username, HashUtil.hashPassword(password), fullName, email, phone, "CUSTOMER", true);
        user = userRepository.save(user);

        Customer customer = new Customer(user, vehicleNo, vehicleType, fuelType);
        customerRepository.save(customer);

        return ResponseEntity.ok(Map.of("message", "Customer registered successfully"));
    }

    // Unified register endpoint used by the frontend auth form
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String password = payload.get("password");
        String fullName = payload.get("fullName");
        String email = payload.get("email");
        String phone = payload.get("phone");
        String role = payload.get("role"); // "CUSTOMER" or "OWNER"

        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username is required"));
        }
        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username is already taken"));
        }

        if ("OWNER".equalsIgnoreCase(role) || "GARAGE_OWNER".equalsIgnoreCase(role)) {
            // Garage owner: active initially so they can log in and submit their garage profile
            User user = new User(username, HashUtil.hashPassword(password), fullName, email, phone, "GARAGE_OWNER", true);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Garage owner account created. Please sign in to register your garage."));
        } else if ("SHOP_OWNER".equalsIgnoreCase(role)) {
            // Spare Part seller
            User user = new User(username, HashUtil.hashPassword(password), fullName, email, phone, "SHOP_OWNER", true);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Shop owner account created. Please sign in to register your spare part shop."));
        } else {
            // Default: customer
            User user = new User(username, HashUtil.hashPassword(password), fullName, email, phone, "CUSTOMER", true);
            user = userRepository.save(user);
            Customer customer = new Customer(user, null, null, null);
            customerRepository.save(customer);
            return ResponseEntity.ok(Map.of("message", "Account created successfully!"));
        }
    }

    @PostMapping("/register/admin")
    public ResponseEntity<?> registerAdmin(@RequestBody Map<String, String> payload, HttpSession session) {
        User loggedIn = (User) session.getAttribute("LOGGED_IN_USER");
        if (loggedIn == null || !"ADMIN".equals(loggedIn.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        String username = payload.get("username");
        String password = payload.get("password");
        String fullName = payload.get("fullName");
        String email = payload.get("email");
        String phone = payload.get("phone");

        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username and password are required"));
        }

        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username is already taken"));
        }

        User user = new User(username, HashUtil.hashPassword(password), fullName, email, phone, "ADMIN", true);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Admin registered successfully"));
    }

    @PostMapping("/register/garage")
    public ResponseEntity<?> registerGarage(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String password = payload.get("password");
        String email = payload.get("email");
        String phone = payload.get("phone");

        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username is already taken"));
        }

        // Garage owner: active initially so they can log in and submit their garage profile
        User user = new User(username, HashUtil.hashPassword(password), email, phone, "GARAGE_OWNER", true);
        user = userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Garage owner account created. Please sign in to register your garage."));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload, HttpSession session) {
        String username = payload.get("username");
        String password = payload.get("password");

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid username or password"));
        }

        User user = userOpt.get();
        if (!user.getPassword().equals(HashUtil.hashPassword(password))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid username or password"));
        }

        if (!user.isActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Your account has been deactivated."));
        }

        session.setAttribute("LOGGED_IN_USER", user);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Login successful");
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("fullName", user.getFullName() != null ? user.getFullName() : user.getUsername());
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
        response.put("username", user.getUsername());
        response.put("fullName", user.getFullName() != null ? user.getFullName() : user.getUsername());
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
            user.setEmail(email);
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
        response.put("username", user.getUsername());
        response.put("fullName", user.getFullName() != null ? user.getFullName() : user.getUsername());
        response.put("email", user.getEmail());
        response.put("phone", user.getPhone());
        response.put("role", user.getRole());
        response.put("message", "Profile updated successfully");

        return ResponseEntity.ok(response);
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

        // 3. CUSTOMER cleanup
        Optional<Customer> customerOpt = customerRepository.findByUserId(userId);
        if (customerOpt.isPresent()) {
            Customer customer = customerOpt.get();
            // Delete reviews
            List<Review> reviews = reviewRepository.findAll();
            for (Review r : reviews) {
                if (r.getCustomer().getId().equals(customer.getId())) {
                    reviewRepository.delete(r);
                }
            }
            // Delete bookings
            List<Booking> bookings = bookingRepository.findByCustomerIdOrderByBookingDateDesc(customer.getId());
            bookingRepository.deleteAll(bookings);
            // Delete breakdown requests
            List<BreakdownRequest> breakdowns = breakdownRequestRepository.findByCustomerIdOrderByCreatedTimeDesc(customer.getId());
            breakdownRequestRepository.deleteAll(breakdowns);
            // Delete customer
            customerRepository.delete(customer);
        }

        // Finally, delete the user
        userRepository.delete(user);

        return ResponseEntity.ok(Map.of("message", "User and all associated data deleted successfully"));
    }
}
