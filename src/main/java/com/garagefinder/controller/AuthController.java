package com.garagefinder.controller;

import com.garagefinder.model.Customer;
import com.garagefinder.model.User;
import com.garagefinder.repository.CustomerRepository;
import com.garagefinder.repository.UserRepository;
import com.garagefinder.util.HashUtil;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CustomerRepository customerRepository;

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

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        return ResponseEntity.ok(userRepository.findAll());
    }
}
