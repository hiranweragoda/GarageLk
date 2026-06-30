package com.garagefinder.controller;

import com.garagefinder.model.SparePart;
import com.garagefinder.model.SparePartShop;
import com.garagefinder.model.User;
import com.garagefinder.model.ShopReview;
import com.garagefinder.model.Notification;
import com.garagefinder.repository.SparePartRepository;
import com.garagefinder.repository.SparePartShopRepository;
import com.garagefinder.repository.UserRepository;
import com.garagefinder.repository.ShopReviewRepository;
import com.garagefinder.repository.NotificationRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping
public class SparePartController {

    private final SparePartShopRepository shopRepository;
    private final SparePartRepository partRepository;
    private final UserRepository userRepository;
    private final ShopReviewRepository shopReviewRepository;
    private final NotificationRepository notificationRepository;

    public SparePartController(SparePartShopRepository shopRepository, SparePartRepository partRepository, UserRepository userRepository, ShopReviewRepository shopReviewRepository, NotificationRepository notificationRepository) {
        this.shopRepository = shopRepository;
        this.partRepository = partRepository;
        this.userRepository = userRepository;
        this.shopReviewRepository = shopReviewRepository;
        this.notificationRepository = notificationRepository;
    }

    // Helper method to calculate distance in kilometers between two coordinates (Haversine formula)
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radious of the earth in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // ==========================================
    // CUSTOMER / PUBLIC ENDPOINTS
    // ==========================================

    @GetMapping("/api/spare-parts/search")
    public ResponseEntity<?> searchSpareParts(
            @RequestParam(required = false) String partName,
            @RequestParam(required = false) String vehicleModel,
            @RequestParam(required = false) Integer vehicleYear,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng) {

        String partParam = (partName != null && !partName.trim().isEmpty()) ? partName.trim() : null;
        String modelParam = (vehicleModel != null && !vehicleModel.trim().isEmpty()) ? vehicleModel.trim() : null;
        String cityParam = (city != null && !city.trim().isEmpty()) ? city.trim() : null;

        List<SparePart> parts = partRepository.searchParts(partParam, modelParam, vehicleYear, cityParam);
        
        List<Map<String, Object>> result = new ArrayList<>();
        for (SparePart p : parts) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", p.getId());
            map.put("partName", p.getPartName());
            map.put("vehicleModel", p.getVehicleModel());
            map.put("vehicleYear", p.getVehicleYear());
            map.put("price", p.getPrice());
            map.put("quantity", p.getQuantity());
            map.put("status", p.getStatus());
            map.put("imageUrl", p.getImageUrl());
            
            SparePartShop shop = p.getShop();
            Map<String, Object> shopMap = new LinkedHashMap<>();
            shopMap.put("id", shop.getId());
            shopMap.put("shopName", shop.getShopName());
            shopMap.put("ownerName", shop.getOwnerName());
            shopMap.put("address", shop.getAddress());
            shopMap.put("city", shop.getCity());
            shopMap.put("phone", shop.getPhone());
            shopMap.put("email", shop.getEmail());
            shopMap.put("openTime", shop.getOpenTime());
            shopMap.put("closeTime", shop.getCloseTime());
            shopMap.put("openDays", shop.getOpenDays());
            shopMap.put("openToday", shop.getOpenToday());
            shopMap.put("latitude", shop.getLatitude());
            shopMap.put("longitude", shop.getLongitude());
            shopMap.put("imageUrl", shop.getImageUrl());
            
            Double avg = shopReviewRepository.findAverageRatingByShopId(shop.getId());
            Long count = shopReviewRepository.countByShopId(shop.getId());
            double ratingVal = avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0;
            shopMap.put("averageRating", ratingVal);
            shopMap.put("rating", ratingVal);
            shopMap.put("reviewCount", count);

            double distance = 0.0;
            if (lat != null && lng != null && shop.getLatitude() != null && shop.getLongitude() != null) {
                distance = calculateDistance(lat, lng, shop.getLatitude(), shop.getLongitude());
            }
            shopMap.put("distance", distance);
            map.put("shop", shopMap);
            map.put("distance", distance); // For direct sorting
            
            result.add(map);
        }

        // Sort by distance if coordinates are provided
        if (lat != null && lng != null) {
            result.sort(Comparator.comparingDouble(m -> (Double) m.get("distance")));
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/api/shops")
    public ResponseEntity<?> getShops(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng) {

        List<SparePartShop> shops;
        if (city != null && !city.trim().isEmpty()) {
            shops = shopRepository.findByCityAndStatus(city.trim(), "APPROVED");
        } else {
            shops = shopRepository.findByStatus("APPROVED");
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (SparePartShop s : shops) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", s.getId());
            map.put("shopName", s.getShopName());
            map.put("name", s.getShopName());
            map.put("ownerName", s.getOwnerName());
            map.put("description", s.getDescription());
            map.put("address", s.getAddress());
            map.put("city", s.getCity());
            map.put("district", s.getDistrict());
            map.put("status", s.getStatus());
            map.put("latitude", s.getLatitude());
            map.put("longitude", s.getLongitude());
            map.put("imageUrl", s.getImageUrl());
            map.put("phone", s.getPhone());
            map.put("email", s.getEmail());
            map.put("openTime", s.getOpenTime());
            map.put("closeTime", s.getCloseTime());
            map.put("openDays", s.getOpenDays());
            map.put("openToday", s.getOpenToday());

            Double avg = shopReviewRepository.findAverageRatingByShopId(s.getId());
            Long count = shopReviewRepository.countByShopId(s.getId());
            double ratingVal = avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0;
            map.put("averageRating", ratingVal);
            map.put("rating", ratingVal);
            map.put("reviewCount", count);

            double distance = 0.0;
            if (lat != null && lng != null && s.getLatitude() != null && s.getLongitude() != null) {
                distance = calculateDistance(lat, lng, s.getLatitude(), s.getLongitude());
            }
            map.put("distance", distance);
            result.add(map);
        }

        if (lat != null && lng != null) {
            result.sort(Comparator.comparingDouble(m -> (Double) m.get("distance")));
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/api/shops/{id}")
    public ResponseEntity<?> getShopDetails(@PathVariable Long id) {
        Optional<SparePartShop> shopOpt = shopRepository.findById(id);
        if (shopOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        SparePartShop shop = shopOpt.get();
        List<SparePart> parts = partRepository.findByShopId(id);

        Double avgRating = shopReviewRepository.findAverageRatingByShopId(id);
        Long reviewCount = shopReviewRepository.countByShopId(id);

        List<ShopReview> reviews = shopReviewRepository.findByShopIdOrderByCreatedAtDesc(id);
        List<Map<String, Object>> reviewsList = new ArrayList<>();
        for (ShopReview r : reviews) {
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

        Map<String, Object> shopMap = new LinkedHashMap<>();
        shopMap.put("id", shop.getId());
        shopMap.put("shopName", shop.getShopName());
        shopMap.put("name", shop.getShopName());
        shopMap.put("ownerName", shop.getOwnerName());
        shopMap.put("description", shop.getDescription());
        shopMap.put("address", shop.getAddress());
        shopMap.put("city", shop.getCity());
        shopMap.put("district", shop.getDistrict());
        shopMap.put("status", shop.getStatus());
        shopMap.put("latitude", shop.getLatitude());
        shopMap.put("longitude", shop.getLongitude());
        shopMap.put("imageUrl", shop.getImageUrl());
        shopMap.put("phone", shop.getPhone());
        shopMap.put("email", shop.getEmail());
        shopMap.put("openTime", shop.getOpenTime());
        shopMap.put("closeTime", shop.getCloseTime());
        shopMap.put("openDays", shop.getOpenDays());
        shopMap.put("openToday", shop.getOpenToday());
        
        double ratingVal = avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0;
        shopMap.put("averageRating", ratingVal);
        shopMap.put("rating", ratingVal);
        shopMap.put("reviewCount", reviewCount);

        Map<String, Object> response = new HashMap<>();
        response.put("shop", shopMap);
        response.put("parts", parts);
        response.put("reviews", reviewsList);
        response.put("averageRating", ratingVal);
        response.put("reviewCount", reviewCount);
        return ResponseEntity.ok(response);
    }

    // ==========================================
    // SHOP OWNER ENDPOINTS
    // ==========================================

    @GetMapping("/api/shops/my")
    public ResponseEntity<?> getMyShops(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"SHOP_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<SparePartShop> shops = shopRepository.findByUserId(user.getId());
        return ResponseEntity.ok(shops);
    }

    @PostMapping("/api/shops")
    public ResponseEntity<?> createShop(@RequestBody Map<String, Object> payload, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"SHOP_OWNER".equals(user.getRole())) {
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
        String businessRegNo = payload.get("businessRegNo") != null ? payload.get("businessRegNo").toString() : null;

        Double latitude = payload.containsKey("latitude") && payload.get("latitude") != null ? Double.parseDouble(payload.get("latitude").toString()) : 6.9271;
        Double longitude = payload.containsKey("longitude") && payload.get("longitude") != null ? Double.parseDouble(payload.get("longitude").toString()) : 79.8612;

        String district = city;

        String openTime = payload.get("openTime") != null ? payload.get("openTime").toString() : null;
        String closeTime = payload.get("closeTime") != null ? payload.get("closeTime").toString() : null;
        String openDays = payload.get("openDays") != null ? payload.get("openDays").toString() : null;
        Boolean openToday = payload.containsKey("openToday") && payload.get("openToday") != null ? Boolean.parseBoolean(payload.get("openToday").toString()) : true;

        SparePartShop shop = new SparePartShop(managedUser, name, managedUser.getFullName() != null ? managedUser.getFullName() : managedUser.getUsername(), description, address, city, district, latitude, longitude);
        shop.setImageUrl(imageUrl);
        shop.setPhone(phone);
        shop.setEmail(email);
        shop.setBusinessRegNo(businessRegNo);
        shop.setOpenTime(openTime);
        shop.setCloseTime(closeTime);
        shop.setOpenDays(openDays);
        shop.setOpenToday(openToday);
        shop.setStatus("PENDING");

        shopRepository.save(shop);

        try {
            List<User> admins = userRepository.findAll().stream().filter(u -> "ADMIN".equals(u.getRole())).toList();
            for (User admin : admins) {
                String msg = String.format("New spare part shop pending approval: %s", name);
                notificationRepository.save(new Notification(admin.getId(), msg));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return ResponseEntity.ok(Map.of("message", "Spare Part Shop registered successfully. Pending admin approval."));
    }

    @PutMapping("/api/shops/{id}")
    public ResponseEntity<?> updateShop(@PathVariable Long id, @RequestBody Map<String, Object> payload, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"SHOP_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<SparePartShop> shopOpt = shopRepository.findById(id);
        if (shopOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        SparePartShop shop = shopOpt.get();
        if (!shop.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        String name = payload.get("name") != null ? payload.get("name").toString() : null;
        String description = payload.get("description") != null ? payload.get("description").toString() : null;
        String address = payload.get("address") != null ? payload.get("address").toString() : null;
        String city = payload.get("city") != null ? payload.get("city").toString() : null;
        String phone = payload.get("phone") != null ? payload.get("phone").toString() : null;
        String email = payload.get("email") != null ? payload.get("email").toString() : null;
        String imageUrl = payload.get("imageUrl") != null ? payload.get("imageUrl").toString() : null;
        String businessRegNo = payload.get("businessRegNo") != null ? payload.get("businessRegNo").toString() : null;

        Double latitude = payload.containsKey("latitude") && payload.get("latitude") != null ? Double.parseDouble(payload.get("latitude").toString()) : shop.getLatitude();
        Double longitude = payload.containsKey("longitude") && payload.get("longitude") != null ? Double.parseDouble(payload.get("longitude").toString()) : shop.getLongitude();

        boolean requireApproval = false;
        if (!Objects.equals(shop.getShopName(), name)) requireApproval = true;
        if (!Objects.equals(shop.getDescription(), description)) requireApproval = true;
        if (!Objects.equals(shop.getAddress(), address)) requireApproval = true;
        if (!Objects.equals(shop.getCity(), city)) requireApproval = true;
        if (!Objects.equals(shop.getPhone(), phone)) requireApproval = true;
        if (!Objects.equals(shop.getEmail(), email)) requireApproval = true;
        if (!Objects.equals(shop.getImageUrl(), imageUrl)) requireApproval = true;
        if (!Objects.equals(shop.getLatitude(), latitude)) requireApproval = true;
        if (!Objects.equals(shop.getLongitude(), longitude)) requireApproval = true;
        if (!Objects.equals(shop.getBusinessRegNo(), businessRegNo)) requireApproval = true;

        shop.setShopName(name);
        shop.setDescription(description);
        shop.setAddress(address);
        shop.setCity(city);
        shop.setDistrict(city);
        String openTime = payload.get("openTime") != null ? payload.get("openTime").toString() : null;
        String closeTime = payload.get("closeTime") != null ? payload.get("closeTime").toString() : null;
        String openDays = payload.get("openDays") != null ? payload.get("openDays").toString() : null;
        Boolean openToday = payload.containsKey("openToday") && payload.get("openToday") != null ? Boolean.parseBoolean(payload.get("openToday").toString()) : true;

        shop.setPhone(phone);
        shop.setEmail(email);
        shop.setImageUrl(imageUrl);
        shop.setLatitude(latitude);
        shop.setLongitude(longitude);
        shop.setBusinessRegNo(businessRegNo);
        shop.setOpenTime(openTime);
        shop.setCloseTime(closeTime);
        shop.setOpenDays(openDays);
        shop.setOpenToday(openToday);

        String message = "Shop profile updated successfully.";
        if (requireApproval) {
            shop.setStatus("PENDING");
            message = "Shop profile updated successfully. Awaiting Admin approval.";
        }

        shopRepository.save(shop);

        return ResponseEntity.ok(Map.of("message", message));
    }

    @GetMapping("/api/shops/{shopId}/parts")
    public ResponseEntity<?> getShopParts(@PathVariable Long shopId, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"SHOP_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<SparePartShop> shopOpt = shopRepository.findById(shopId);
        if (shopOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        SparePartShop shop = shopOpt.get();
        if (!shop.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        List<SparePart> parts = partRepository.findByShopId(shopId);
        return ResponseEntity.ok(parts);
    }

    @PostMapping("/api/shops/{shopId}/parts")
    public ResponseEntity<?> addOrUpdatePart(
            @PathVariable Long shopId,
            @RequestBody Map<String, Object> payload,
            HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"SHOP_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<SparePartShop> shopOpt = shopRepository.findById(shopId);
        if (shopOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Shop not found"));
        }

        SparePartShop shop = shopOpt.get();
        if (!shop.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        String partName = payload.get("partName") != null ? payload.get("partName").toString() : null;
        String vehicleModel = payload.get("vehicleModel") != null ? payload.get("vehicleModel").toString() : null;
        String imageUrl = payload.get("imageUrl") != null ? payload.get("imageUrl").toString() : null;
        
        Integer vehicleYear;
        try {
            vehicleYear = Integer.parseInt(payload.get("vehicleYear").toString());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid vehicle year format"));
        }

        Double price;
        try {
            price = Double.parseDouble(payload.get("price").toString());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid price format"));
        }

        Integer quantity = 1;
        if (payload.containsKey("quantity") && payload.get("quantity") != null) {
            try {
                quantity = Integer.parseInt(payload.get("quantity").toString());
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid quantity format"));
            }
        }

        Long partId = payload.get("id") != null ? Long.parseLong(payload.get("id").toString()) : null;

        SparePart part;
        if (partId != null) {
            Optional<SparePart> existingOpt = partRepository.findById(partId);
            if (existingOpt.isEmpty() || !existingOpt.get().getShop().getId().equals(shopId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
            }
            part = existingOpt.get();
            part.setPartName(partName);
            part.setVehicleModel(vehicleModel);
            part.setVehicleYear(vehicleYear);
            part.setPrice(price);
            part.setQuantity(quantity);
            part.setImageUrl(imageUrl);
        } else {
            part = new SparePart(shop, partName, vehicleModel, vehicleYear, price, quantity);
            part.setImageUrl(imageUrl);
        }

        partRepository.save(part);
        return ResponseEntity.ok(Map.of("message", "Spare part saved successfully"));
    }

    @DeleteMapping("/api/shops/{shopId}/parts/{partId}")
    public ResponseEntity<?> deletePart(
            @PathVariable Long shopId,
            @PathVariable Long partId,
            HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"SHOP_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<SparePartShop> shopOpt = shopRepository.findById(shopId);
        if (shopOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Shop not found"));
        }

        SparePartShop shop = shopOpt.get();
        if (!shop.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        Optional<SparePart> partOpt = partRepository.findById(partId);
        if (partOpt.isEmpty() || !partOpt.get().getShop().getId().equals(shop.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        partRepository.deleteById(partId);
        return ResponseEntity.ok(Map.of("message", "Spare part deleted successfully"));
    }

    // ==========================================
    // ADMIN ENDPOINTS
    // ==========================================

    @GetMapping("/api/shops/pending")
    public ResponseEntity<?> getPendingShops(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<SparePartShop> pendingShops = shopRepository.findByStatus("PENDING");
        return ResponseEntity.ok(pendingShops);
    }

    @PostMapping("/api/shops/{id}/approve")
    public ResponseEntity<?> approveShop(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<SparePartShop> shopOpt = shopRepository.findById(id);
        if (shopOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        SparePartShop shop = shopOpt.get();
        shop.setStatus("APPROVED");
        shopRepository.save(shop);

        try {
            Long ownerUserId = shop.getUser().getId();
            String msg = String.format("Your shop %s has been APPROVED.", shop.getShopName());
            notificationRepository.save(new Notification(ownerUserId, msg));
        } catch (Exception e) {
            e.printStackTrace();
        }

        return ResponseEntity.ok(Map.of("message", "Shop approved successfully"));
    }

    @PostMapping("/api/shops/{id}/reject")
    public ResponseEntity<?> rejectShop(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<SparePartShop> shopOpt = shopRepository.findById(id);
        if (shopOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        SparePartShop shop = shopOpt.get();
        shop.setStatus("REJECTED");
        shopRepository.save(shop);

        try {
            Long ownerUserId = shop.getUser().getId();
            String msg = String.format("Your shop %s registration has been REJECTED.", shop.getShopName());
            notificationRepository.save(new Notification(ownerUserId, msg));
        } catch (Exception e) {
            e.printStackTrace();
        }

        return ResponseEntity.ok(Map.of("message", "Shop registration rejected"));
    }

    @GetMapping("/api/shops/all")
    public ResponseEntity<?> getAllShopsForAdmin(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<SparePartShop> allShops = shopRepository.findAll();
        return ResponseEntity.ok(allShops);
    }

    @PutMapping("/api/shops/{id}/status")
    public ResponseEntity<?> updateShopStatus(@PathVariable Long id, @RequestBody Map<String, Object> payload, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<SparePartShop> shopOpt = shopRepository.findById(id);
        if (shopOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        SparePartShop shop = shopOpt.get();
        String status = payload.get("status") != null ? payload.get("status").toString() : null;
        
        if ("APPROVED".equalsIgnoreCase(status)) {
            shop.setStatus("APPROVED");
            shopRepository.save(shop);
            
            try {
                notificationRepository.save(new Notification(shop.getUser().getId(), String.format("Your shop %s has been APPROVED.", shop.getShopName())));
            } catch (Exception e) { e.printStackTrace(); }

            return ResponseEntity.ok(Map.of("message", "Shop approved successfully"));
        } else if ("REJECTED".equalsIgnoreCase(status)) {
            shop.setStatus("REJECTED");
            shopRepository.save(shop);
            
            try {
                notificationRepository.save(new Notification(shop.getUser().getId(), String.format("Your shop %s registration has been REJECTED.", shop.getShopName())));
            } catch (Exception e) { e.printStackTrace(); }

            return ResponseEntity.ok(Map.of("message", "Shop rejected successfully"));
        } else if ("SUSPENDED".equalsIgnoreCase(status)) {
            shop.setStatus("SUSPENDED");
            shopRepository.save(shop);
            
            try {
                notificationRepository.save(new Notification(shop.getUser().getId(), String.format("Your shop %s has been SUSPENDED by the administrator.", shop.getShopName())));
            } catch (Exception e) { e.printStackTrace(); }

            return ResponseEntity.ok(Map.of("message", "Shop suspended successfully"));
        }

        return ResponseEntity.badRequest().body(Map.of("message", "Invalid status"));
    }

    @DeleteMapping("/api/shops/{id}")
    public ResponseEntity<?> deleteShop(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"SHOP_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<SparePartShop> shopOpt = shopRepository.findById(id);
        if (shopOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        SparePartShop shop = shopOpt.get();
        if (!shop.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        // Delete all associated spare parts first to maintain database integrity
        List<SparePart> parts = partRepository.findByShopId(id);
        partRepository.deleteAll(parts);

        // Delete the shop itself
        shopRepository.delete(shop);

        return ResponseEntity.ok(Map.of("message", "Spare Part Shop deleted successfully"));
    }
}
