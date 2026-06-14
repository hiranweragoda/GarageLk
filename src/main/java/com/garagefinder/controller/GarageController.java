package com.garagefinder.controller;

import com.garagefinder.model.Garage;
import com.garagefinder.model.OfferedService;
import com.garagefinder.model.User;
import com.garagefinder.model.Mechanic;
import com.garagefinder.repository.GarageRepository;
import com.garagefinder.repository.OfferedServiceRepository;
import com.garagefinder.repository.ReviewRepository;
import com.garagefinder.repository.UserRepository;
import com.garagefinder.repository.MechanicRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import com.garagefinder.model.Booking;
import com.garagefinder.model.BreakdownRequest;
import com.garagefinder.model.Review;
import com.garagefinder.repository.BookingRepository;
import com.garagefinder.repository.BreakdownRequestRepository;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("/api/garages")
public class GarageController {

    private final GarageRepository garageRepository;
    private final OfferedServiceRepository offeredServiceRepository;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final BreakdownRequestRepository breakdownRequestRepository;
    private final MechanicRepository mechanicRepository;

    public GarageController(
            GarageRepository garageRepository,
            OfferedServiceRepository offeredServiceRepository,
            UserRepository userRepository,
            ReviewRepository reviewRepository,
            BookingRepository bookingRepository,
            BreakdownRequestRepository breakdownRequestRepository,
            MechanicRepository mechanicRepository) {
        this.garageRepository = garageRepository;
        this.offeredServiceRepository = offeredServiceRepository;
        this.userRepository = userRepository;
        this.reviewRepository = reviewRepository;
        this.bookingRepository = bookingRepository;
        this.breakdownRequestRepository = breakdownRequestRepository;
        this.mechanicRepository = mechanicRepository;
    }

    // Search/List garages with optional filters
    @GetMapping
    public ResponseEntity<?> getGarages(
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String serviceType,
            @RequestParam(required = false) String vehicleType,
            @RequestParam(required = false) String engineType) {

        List<Garage> garages;

        // Service type filter uses a JOIN query — handle separately
        if (serviceType != null && !serviceType.isEmpty()) {
            garages = garageRepository.findByServiceTypeAndStatus(serviceType, "APPROVED");
        } else {
            // Use combined filter query for all other combinations
            String cityParam = (city != null && !city.isEmpty()) ? city : null;
            String districtParam = (district != null && !district.isEmpty()) ? district : null;
            String vehicleParam = (vehicleType != null && !vehicleType.isEmpty()) ? vehicleType : null;
            String engineParam = (engineType != null && !engineType.isEmpty()) ? engineType : null;
            garages = garageRepository.findWithFilters(cityParam, districtParam, vehicleParam, engineParam);
        }

        // Attach rating summary to each garage
        List<Map<String, Object>> result = new ArrayList<>();
        for (Garage g : garages) {
            result.add(buildGarageMap(g));
        }

        return ResponseEntity.ok(result);
    }

    // Get specific garage and its services + reviews summary
    @GetMapping("/{id}")
    public ResponseEntity<?> getGarageDetails(@PathVariable Long id) {
        Optional<Garage> garageOpt = garageRepository.findById(id);
        if (garageOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Garage garage = garageOpt.get();
        List<OfferedService> services = offeredServiceRepository.findByGarageId(id);

        Double avgRating = reviewRepository.findAverageRatingByGarageId(id);
        Long reviewCount = reviewRepository.countByGarageId(id);

        List<Review> reviews = reviewRepository.findByGarageIdOrderByCreatedAtDesc(id);
        List<Map<String, Object>> reviewsList = new ArrayList<>();
        for (Review r : reviews) {
            Map<String, Object> rMap = new HashMap<>();
            rMap.put("id", r.getId());
            rMap.put("rating", r.getStarRating());
            rMap.put("comment", r.getComment());
            rMap.put("createdAt", r.getCreatedAt());
            
            Map<String, Object> uMap = new HashMap<>();
            User u = r.getCustomer().getUser();
            uMap.put("username", u.getUsername());
            uMap.put("fullName", u.getFullName());
            rMap.put("user", uMap);
            
            reviewsList.add(rMap);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("garage", buildGarageMap(garage));
        response.put("services", services);
        response.put("reviews", reviewsList);
        response.put("averageRating", avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0);
        response.put("reviewCount", reviewCount);

        return ResponseEntity.ok(response);
    }

    private Map<String, Object> buildGarageMap(Garage g) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", g.getId());
        map.put("garageName", g.getGarageName());
        map.put("name", g.getGarageName()); // Add name for frontend compatibility
        map.put("ownerName", g.getOwnerName());
        map.put("description", g.getDescription());
        map.put("address", g.getAddress());
        map.put("city", g.getCity());
        map.put("district", g.getDistrict());
        map.put("status", g.getStatus());
        map.put("latitude", g.getLatitude());
        map.put("longitude", g.getLongitude());
        map.put("vehicleTypes", g.getVehicleTypes());
        map.put("engineTypes", g.getEngineTypes());
        map.put("user", g.getUser());

        Double avg = reviewRepository.findAverageRatingByGarageId(g.getId());
        Long count = reviewRepository.countByGarageId(g.getId());
        double ratingVal = avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0;
        map.put("averageRating", ratingVal);
        map.put("rating", ratingVal); // Add rating for frontend compatibility
        map.put("reviewCount", count);
        return map;
    }

    // --- Garage Owner Endpoints ---

    @GetMapping("/my")
    public ResponseEntity<?> getMyGarages(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"GARAGE_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<Garage> garages = garageRepository.findByUserId(user.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (Garage g : garages) {
            result.add(buildGarageMap(g));
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/services")
    public ResponseEntity<?> getMyServices(@RequestParam(required = false) Long garageId, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"GARAGE_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<Garage> garages = garageRepository.findByUserId(user.getId());
        if (garages.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Garage profile not found"));
        }

        if (garageId != null) {
            Optional<Garage> targetGarage = garages.stream().filter(g -> g.getId().equals(garageId)).findFirst();
            if (targetGarage.isEmpty()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
            }
            List<OfferedService> services = offeredServiceRepository.findByGarageId(garageId);
            return ResponseEntity.ok(services);
        } else {
            List<Long> garageIds = garages.stream().map(Garage::getId).toList();
            List<OfferedService> services = offeredServiceRepository.findAll().stream()
                .filter(s -> garageIds.contains(s.getGarage().getId())).toList();
            return ResponseEntity.ok(services);
        }
    }

    @PostMapping("/{garageId}/services")
    public ResponseEntity<?> addOrUpdateService(
            @PathVariable Long garageId,
            @RequestBody Map<String, Object> payload,
            HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"GARAGE_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<Garage> garageOpt = garageRepository.findById(garageId);
        if (garageOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Garage profile not found"));
        }

        Garage garage = garageOpt.get();
        if (!garage.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        String serviceType = payload.containsKey("serviceType") && payload.get("serviceType") != null 
            ? payload.get("serviceType").toString() 
            : (payload.get("serviceName") != null ? payload.get("serviceName").toString() : null);

        if (serviceType == null || serviceType.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Service name/type is required"));
        }

        Double price = 0.0;
        try {
            price = Double.parseDouble(payload.get("price").toString());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid price format"));
        }

        Long serviceId = payload.containsKey("id") && payload.get("id") != null ? Long.parseLong(payload.get("id").toString()) : null;

        Optional<OfferedService> existingOpt = Optional.empty();
        if (serviceId != null) {
            existingOpt = offeredServiceRepository.findById(serviceId);
        } else {
            existingOpt = offeredServiceRepository.findByGarageIdAndServiceType(garage.getId(), serviceType);
        }

        String description = payload.containsKey("description") && payload.get("description") != null 
            ? payload.get("description").toString() 
            : null;

        OfferedService service;
        if (existingOpt.isPresent()) {
            service = existingOpt.get();
            service.setServiceType(serviceType);
            service.setPrice(price);
        } else {
            service = new OfferedService(garage, serviceType, price);
        }
        service.setDescription(description);

        offeredServiceRepository.save(service);
        return ResponseEntity.ok(Map.of("message", "Service saved successfully"));
    }

    @DeleteMapping("/{garageId}/services/{id}")
    public ResponseEntity<?> deleteService(
            @PathVariable Long garageId,
            @PathVariable Long id,
            HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"GARAGE_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<Garage> garageOpt = garageRepository.findById(garageId);
        if (garageOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Garage profile not found"));
        }

        Garage garage = garageOpt.get();
        if (!garage.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        Optional<OfferedService> serviceOpt = offeredServiceRepository.findById(id);
        if (serviceOpt.isEmpty() || !serviceOpt.get().getGarage().getId().equals(garage.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        offeredServiceRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Service deleted successfully"));
    }

    // --- Admin Endpoints ---

    @GetMapping("/pending")
    public ResponseEntity<?> getPendingGarages(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<Garage> pendingGarages = garageRepository.findByStatus("PENDING");
        return ResponseEntity.ok(pendingGarages);
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveGarage(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<Garage> garageOpt = garageRepository.findById(id);
        if (garageOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Garage garage = garageOpt.get();
        garage.setStatus("APPROVED");
        garageRepository.save(garage);

        return ResponseEntity.ok(Map.of("message", "Garage approved successfully"));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectGarage(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<Garage> garageOpt = garageRepository.findById(id);
        if (garageOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Garage garage = garageOpt.get();
        garage.setStatus("REJECTED");
        garageRepository.save(garage);

        return ResponseEntity.ok(Map.of("message", "Garage registration rejected"));
    }

    @GetMapping("/all")
    public ResponseEntity<?> getAllGaragesForAdmin(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<Garage> allGarages = garageRepository.findAll();
        return ResponseEntity.ok(allGarages);
    }

    @PostMapping
    public ResponseEntity<?> createGarage(@RequestBody Map<String, Object> payload, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"GARAGE_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<User> userOpt = userRepository.findById(user.getId());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "User not found"));
        }
        User managedUser = userOpt.get();

        String name = payload.get("name") != null ? payload.get("name").toString() : null;
        String description = payload.get("description") != null ? payload.get("description").toString() : null;
        String address = payload.get("address") != null ? payload.get("address").toString() : null;
        String city = payload.get("city") != null ? payload.get("city").toString() : null;
        String phone = payload.get("phone") != null ? payload.get("phone").toString() : null;
        String email = payload.get("email") != null ? payload.get("email").toString() : null;
        String imageUrl = payload.get("imageUrl") != null ? payload.get("imageUrl").toString() : null;
        
        Double latitude = payload.containsKey("latitude") && payload.get("latitude") != null ? Double.parseDouble(payload.get("latitude").toString()) : 6.9271;
        Double longitude = payload.containsKey("longitude") && payload.get("longitude") != null ? Double.parseDouble(payload.get("longitude").toString()) : 79.8612;

        String district = city;

        Garage garage = new Garage(managedUser, name, managedUser.getFullName() != null ? managedUser.getFullName() : managedUser.getUsername(), description, address, city, district, latitude, longitude);
        garage.setImageUrl(imageUrl);
        garage.setPhone(phone);
        garage.setEmail(email);
        garage.setStatus("PENDING");
        
        garageRepository.save(garage);

        return ResponseEntity.ok(Map.of("message", "Garage registered successfully. Pending admin approval."));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateGarageStatus(@PathVariable Long id, @RequestBody Map<String, Object> payload, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<Garage> garageOpt = garageRepository.findById(id);
        if (garageOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Garage garage = garageOpt.get();
        String status = payload.get("status") != null ? payload.get("status").toString() : null;
        
        if ("APPROVED".equalsIgnoreCase(status)) {
            garage.setStatus("APPROVED");
            garageRepository.save(garage);
            
            return ResponseEntity.ok(Map.of("message", "Garage approved successfully"));
        } else if ("REJECTED".equalsIgnoreCase(status)) {
            garage.setStatus("REJECTED");
            garageRepository.save(garage);
            
            return ResponseEntity.ok(Map.of("message", "Garage rejected successfully"));
        } else if ("CANCELLED".equalsIgnoreCase(status)) {
            garage.setStatus("CANCELLED");
            garageRepository.save(garage);
            
            return ResponseEntity.ok(Map.of("message", "Garage cancelled successfully"));
        } else if ("SUSPENDED".equalsIgnoreCase(status)) {
            garage.setStatus("SUSPENDED");
            garageRepository.save(garage);
            
            return ResponseEntity.ok(Map.of("message", "Garage suspended successfully"));
        }

        return ResponseEntity.badRequest().body(Map.of("message", "Invalid status"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateGarage(@PathVariable Long id, @RequestBody Map<String, Object> payload, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"GARAGE_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<Garage> garageOpt = garageRepository.findById(id);
        if (garageOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Garage garage = garageOpt.get();
        if (!garage.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        String name = payload.get("name") != null ? payload.get("name").toString() : null;
        String description = payload.get("description") != null ? payload.get("description").toString() : null;
        String address = payload.get("address") != null ? payload.get("address").toString() : null;
        String city = payload.get("city") != null ? payload.get("city").toString() : null;
        String phone = payload.get("phone") != null ? payload.get("phone").toString() : null;
        String email = payload.get("email") != null ? payload.get("email").toString() : null;
        String imageUrl = payload.get("imageUrl") != null ? payload.get("imageUrl").toString() : null;
        
        Double latitude = payload.containsKey("latitude") && payload.get("latitude") != null ? Double.parseDouble(payload.get("latitude").toString()) : garage.getLatitude();
        Double longitude = payload.containsKey("longitude") && payload.get("longitude") != null ? Double.parseDouble(payload.get("longitude").toString()) : garage.getLongitude();

        garage.setGarageName(name);
        garage.setDescription(description);
        garage.setAddress(address);
        garage.setCity(city);
        garage.setDistrict(city);
        garage.setPhone(phone);
        garage.setEmail(email);
        garage.setImageUrl(imageUrl);
        garage.setLatitude(latitude);
        garage.setLongitude(longitude);
        garage.setStatus("PENDING");

        garageRepository.save(garage);

        return ResponseEntity.ok(Map.of("message", "Garage profile updated successfully. Awaiting Admin approval."));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteGarage(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<Garage> garageOpt = garageRepository.findById(id);
        if (garageOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Garage garage = garageOpt.get();

        boolean isAuthorized = "ADMIN".equals(user.getRole()) || 
            ("GARAGE_OWNER".equals(user.getRole()) && garage.getUser().getId().equals(user.getId()));

        if (!isAuthorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        // Clean up references:
        // 0. Mechanics
        List<Mechanic> mechanics = mechanicRepository.findByGarageId(id);
        mechanicRepository.deleteAll(mechanics);

        // 1. OfferedServices
        offeredServiceRepository.deleteByGarageId(id);

        // 2. Reviews
        List<Review> reviews = reviewRepository.findByGarageIdOrderByCreatedAtDesc(id);
        reviewRepository.deleteAll(reviews);

        // 3. Bookings
        List<Booking> bookings = bookingRepository.findByGarageId(id);
        bookingRepository.deleteAll(bookings);

        // 4. BreakdownRequests
        List<BreakdownRequest> breakdowns = breakdownRequestRepository.findByAssignedGarageId(id);
        for (BreakdownRequest br : breakdowns) {
            br.setAssignedGarage(null);
            if ("ACCEPTED".equals(br.getStatus())) {
                br.setStatus("OPEN");
            }
            breakdownRequestRepository.save(br);
        }

        garageRepository.delete(garage);

        return ResponseEntity.ok(Map.of("message", "Garage deleted successfully"));
    }

    @PostMapping("/admin/toggle-user/{userId}")
    public ResponseEntity<?> toggleUserActive(@PathVariable Long userId, HttpSession session) {
        User loggedIn = (User) session.getAttribute("LOGGED_IN_USER");
        if (loggedIn == null || !"ADMIN".equals(loggedIn.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        if (loggedIn.getId().equals(userId)) {
            return ResponseEntity.badRequest().body(Map.of("message", "You cannot deactivate your own admin account."));
        }

        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();
        user.setActive(!user.isActive());
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
            "message", "User status updated successfully",
            "active", user.isActive()
        ));
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "File is empty"));
        }

        try {
            // Ensure uploads directory exists
            java.io.File uploadDir = new java.io.File("uploads");
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }

            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String filename = UUID.randomUUID().toString() + extension;

            // Save file
            java.io.File destination = new java.io.File(uploadDir.getAbsolutePath() + java.io.File.separator + filename);
            file.transferTo(destination);

            // Return URL
            String imageUrl = "/uploads/" + filename;
            return ResponseEntity.ok(Map.of("imageUrl", imageUrl));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to upload image: " + e.getMessage()));
        }
    }
}
