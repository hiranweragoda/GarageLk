package com.garagefinder.controller;

import com.garagefinder.model.SparePart;
import com.garagefinder.model.SparePartShop;
import com.garagefinder.model.User;
import com.garagefinder.repository.SparePartRepository;
import com.garagefinder.repository.SparePartShopRepository;
import com.garagefinder.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping
public class SparePartController {

    @Autowired
    private SparePartShopRepository shopRepository;

    @Autowired
    private SparePartRepository partRepository;

    @Autowired
    private UserRepository userRepository;

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
            shopMap.put("latitude", shop.getLatitude());
            shopMap.put("longitude", shop.getLongitude());
            shopMap.put("imageUrl", shop.getImageUrl());
            
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

        Map<String, Object> response = new HashMap<>();
        response.put("shop", shop);
        response.put("parts", parts);
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

        Double latitude = payload.containsKey("latitude") && payload.get("latitude") != null ? Double.parseDouble(payload.get("latitude").toString()) : 6.9271;
        Double longitude = payload.containsKey("longitude") && payload.get("longitude") != null ? Double.parseDouble(payload.get("longitude").toString()) : 79.8612;

        String district = city;

        SparePartShop shop = new SparePartShop(managedUser, name, managedUser.getFullName() != null ? managedUser.getFullName() : managedUser.getUsername(), description, address, city, district, latitude, longitude);
        shop.setImageUrl(imageUrl);
        shop.setPhone(phone);
        shop.setEmail(email);
        shop.setStatus("PENDING");

        shopRepository.save(shop);

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

        Double latitude = payload.containsKey("latitude") && payload.get("latitude") != null ? Double.parseDouble(payload.get("latitude").toString()) : shop.getLatitude();
        Double longitude = payload.containsKey("longitude") && payload.get("longitude") != null ? Double.parseDouble(payload.get("longitude").toString()) : shop.getLongitude();

        shop.setShopName(name);
        shop.setDescription(description);
        shop.setAddress(address);
        shop.setCity(city);
        shop.setDistrict(city);
        shop.setPhone(phone);
        shop.setEmail(email);
        shop.setImageUrl(imageUrl);
        shop.setLatitude(latitude);
        shop.setLongitude(longitude);
        shop.setStatus("PENDING");

        shopRepository.save(shop);

        return ResponseEntity.ok(Map.of("message", "Shop profile updated successfully. Awaiting Admin approval."));
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
}
