package com.garagefinder.controller;

import com.garagefinder.model.BreakdownRequest;
import com.garagefinder.model.Customer;
import com.garagefinder.model.Garage;
import com.garagefinder.model.Mechanic;
import com.garagefinder.model.User;
import com.garagefinder.model.Notification;
import com.garagefinder.repository.BreakdownRequestRepository;
import com.garagefinder.repository.CustomerRepository;
import com.garagefinder.repository.GarageRepository;
import com.garagefinder.repository.MechanicRepository;
import com.garagefinder.repository.NotificationRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;

@RestController
@RequestMapping("/api/breakdowns")
public class BreakdownController {

    private final BreakdownRequestRepository breakdownRequestRepository;
    private final CustomerRepository customerRepository;
    private final GarageRepository garageRepository;
    private final MechanicRepository mechanicRepository;
    private final NotificationRepository notificationRepository;

    public BreakdownController(
            BreakdownRequestRepository breakdownRequestRepository,
            CustomerRepository customerRepository,
            GarageRepository garageRepository,
            MechanicRepository mechanicRepository,
            NotificationRepository notificationRepository) {
        this.breakdownRequestRepository = breakdownRequestRepository;
        this.customerRepository = customerRepository;
        this.garageRepository = garageRepository;
        this.mechanicRepository = mechanicRepository;
        this.notificationRepository = notificationRepository;
    }

    // File an emergency breakdown request (Customer only)
    @PostMapping
    public ResponseEntity<?> createBreakdownRequest(@RequestBody Map<String, Object> payload, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"CUSTOMER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Only customers can file emergency breakdown requests"));
        }

        Optional<Customer> customerOpt = customerRepository.findByUserId(user.getId());
        if (customerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Customer profile not found"));
        }

        String description = payload.get("description") != null ? payload.get("description").toString() : null;
        String locationCity = payload.containsKey("city") ? (payload.get("city") != null ? payload.get("city").toString() : null) : (payload.get("locationCity") != null ? payload.get("locationCity").toString() : null);
        String contactPhone = payload.containsKey("phone") ? (payload.get("phone") != null ? payload.get("phone").toString() : null) : (payload.get("contactPhone") != null ? payload.get("contactPhone").toString() : null);
        String address = payload.get("address") != null ? payload.get("address").toString() : null;
        String vehicleNo = payload.get("vehicleNo") != null ? payload.get("vehicleNo").toString() : null;
        Double latitude = payload.containsKey("latitude") && payload.get("latitude") != null ? Double.parseDouble(payload.get("latitude").toString()) : 6.9271;
        Double longitude = payload.containsKey("longitude") && payload.get("longitude") != null ? Double.parseDouble(payload.get("longitude").toString()) : 79.8612;

        BreakdownRequest request = new BreakdownRequest(customerOpt.get(), description, locationCity, "OPEN", contactPhone, latitude, longitude);
        request.setAddress(address);
        request.setVehicleNo(vehicleNo);
        
        String breakdownCode;
        String dateStr = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        String pattern = "EMB-" + dateStr + "%";
        long countToday = breakdownRequestRepository.countByBreakdownCodeLike(pattern);
        long seq = countToday + 1;
        do {
            breakdownCode = String.format("EMB-%s%02d", dateStr, seq++);
        } while (breakdownRequestRepository.findByBreakdownCode(breakdownCode).isPresent());
        request.setBreakdownCode(breakdownCode);

        breakdownRequestRepository.save(request);

        try {
            List<Garage> garages = garageRepository.findByCityAndStatus(locationCity, "APPROVED");
            if (garages.isEmpty()) {
                garages = garageRepository.findByStatus("APPROVED");
            }
            Set<Long> notifiedUserIds = new HashSet<>();
            for (Garage g : garages) {
                Long ownerUserId = g.getUser().getId();
                if (notifiedUserIds.add(ownerUserId)) {
                    String msg = String.format("New emergency breakdown alert in city %s: %s (Code: %s)", 
                        locationCity, description != null && description.length() > 50 ? description.substring(0, 47) + "..." : description, breakdownCode);
                    notificationRepository.save(new Notification(ownerUserId, msg));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return ResponseEntity.ok(Map.of("message", "Emergency breakdown request published. Nearby garages have been notified."));
    }

    // Get all breakdown requests (Admin only)
    @GetMapping("/all")
    public ResponseEntity<?> getAllBreakdowns(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        List<BreakdownRequest> allRequests = breakdownRequestRepository.findAll();
        return ResponseEntity.ok(allRequests);
    }

    // Get breakdown requests logged by current customer
    @GetMapping("/my")
    public ResponseEntity<?> getMyBreakdowns(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"CUSTOMER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<Customer> customerOpt = customerRepository.findByUserId(user.getId());
        if (customerOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Customer profile not found"));
        }

        List<BreakdownRequest> requests = breakdownRequestRepository.findByCustomerIdOrderByCreatedTimeDesc(customerOpt.get().getId());
        return ResponseEntity.ok(requests);
    }

    // Get all active open requests (For Garages to view and respond)
    @GetMapping("/active")
    public ResponseEntity<?> getActiveBreakdowns(@RequestParam(required = false) String city, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || (!"GARAGE_OWNER".equals(user.getRole()) && !"ADMIN".equals(user.getRole()))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<BreakdownRequest> activeRequests;
        if (city != null && !city.isEmpty()) {
            activeRequests = breakdownRequestRepository.findByLocationCityAndStatusOrderByCreatedTimeDesc(city, "OPEN");
        } else {
            activeRequests = breakdownRequestRepository.findByStatusOrderByCreatedTimeDesc("OPEN");
        }
        return ResponseEntity.ok(activeRequests);
    }

    // Respond to an emergency request (Garage owner only)
    @PutMapping("/{id}/accept")
    public ResponseEntity<?> acceptBreakdown(@PathVariable Long id, @RequestBody Map<String, Object> payload, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"GARAGE_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Only registered garage owners can respond"));
        }

        Long garageId = null;
        if (payload != null && payload.containsKey("garageId") && payload.get("garageId") != null) {
            garageId = Long.parseLong(payload.get("garageId").toString());
        }

        Optional<Garage> garageOpt;
        if (garageId != null) {
            garageOpt = garageRepository.findById(garageId);
            if (garageOpt.isPresent() && !garageOpt.get().getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
            }
        } else {
            List<Garage> garages = garageRepository.findByUserId(user.getId());
            garageOpt = garages.isEmpty() ? Optional.empty() : Optional.of(garages.get(0));
        }

        if (garageOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Garage profile not found or access denied"));
        }

        Optional<BreakdownRequest> requestOpt = breakdownRequestRepository.findById(id);
        if (requestOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        BreakdownRequest request = requestOpt.get();
        if (!"OPEN".equals(request.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "This request is no longer open"));
        }

        request.setStatus("ACCEPTED");
        request.setAssignedGarage(garageOpt.get());

        Long mechanicId = null;
        if (payload != null && payload.containsKey("mechanicId") && payload.get("mechanicId") != null) {
            mechanicId = Long.parseLong(payload.get("mechanicId").toString());
        }

        if (mechanicId != null) {
            Optional<Mechanic> mechanicOpt = mechanicRepository.findById(mechanicId);
            if (mechanicOpt.isPresent()) {
                Mechanic mechanic = mechanicOpt.get();
                if (mechanic.getGarage().getId().equals(garageOpt.get().getId())) {
                    request.setAssignedMechanic(mechanic);
                    mechanic.setStatus("ON_RESCUE");
                    mechanicRepository.save(mechanic);
                } else {
                    return ResponseEntity.badRequest().body(Map.of("message", "Selected mechanic does not belong to the dispatching garage"));
                }
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "Selected mechanic not found"));
            }
        }

        breakdownRequestRepository.save(request);

        try {
            Long customerUserId = request.getCustomer().getUser().getId();
            String msg = String.format("Emergency assist request accepted by %s. (Code: %s)",
                garageOpt.get().getGarageName(), request.getBreakdownCode());
            notificationRepository.save(new Notification(customerUserId, msg));
        } catch (Exception e) {
            e.printStackTrace();
        }

        return ResponseEntity.ok(Map.of("message", "You have successfully responded to this breakdown request"));
    }

    // Resolve an emergency request (Garage or Customer)
    @PutMapping("/{id}/complete")
    public ResponseEntity<?> completeBreakdown(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<BreakdownRequest> requestOpt = breakdownRequestRepository.findById(id);
        if (requestOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        BreakdownRequest request = requestOpt.get();

        // Check if authorized (must be the customer who created it or the assigned garage)
        boolean authorized = false;
        if ("ADMIN".equals(user.getRole())) {
            authorized = true;
        } else if ("CUSTOMER".equals(user.getRole())) {
            Optional<Customer> customerOpt = customerRepository.findByUserId(user.getId());
            if (customerOpt.isPresent() && request.getCustomer().getId().equals(customerOpt.get().getId())) {
                authorized = true;
            }
        } else if ("GARAGE_OWNER".equals(user.getRole())) {
            List<Garage> garages = garageRepository.findByUserId(user.getId());
            if (request.getAssignedGarage() != null) {
                authorized = garages.stream().anyMatch(g -> g.getId().equals(request.getAssignedGarage().getId()));
            }
        }

        if (!authorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        request.setStatus("COMPLETED");
        if (request.getAssignedMechanic() != null) {
            Mechanic mechanic = request.getAssignedMechanic();
            mechanic.setStatus("AVAILABLE");
            mechanicRepository.save(mechanic);
        }
        breakdownRequestRepository.save(request);

        try {
            Long customerUserId = request.getCustomer().getUser().getId();
            String msg = String.format("Emergency assist request has been completed. (Code: %s)",
                request.getBreakdownCode());
            notificationRepository.save(new Notification(customerUserId, msg));
        } catch (Exception e) {
            e.printStackTrace();
        }

        return ResponseEntity.ok(Map.of("message", "Breakdown request resolved"));
    }

    // Cancel an emergency request (Customer or Admin)
    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelBreakdown(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> payload,
            HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<BreakdownRequest> requestOpt = breakdownRequestRepository.findById(id);
        if (requestOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        BreakdownRequest request = requestOpt.get();

        // Check authorization (only the customer who filed it or admin can cancel)
        boolean authorized = false;
        if ("ADMIN".equals(user.getRole())) {
            authorized = true;
        } else if ("CUSTOMER".equals(user.getRole())) {
            Optional<Customer> customerOpt = customerRepository.findByUserId(user.getId());
            if (customerOpt.isPresent() && request.getCustomer().getId().equals(customerOpt.get().getId())) {
                authorized = true;
            }
        }

        if (!authorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        request.setStatus("CANCELLED");
        if (payload != null && payload.get("cancellationReason") != null) {
            request.setCancellationReason(payload.get("cancellationReason").toString());
        }
        if (request.getAssignedMechanic() != null) {
            Mechanic mechanic = request.getAssignedMechanic();
            mechanic.setStatus("AVAILABLE");
            mechanicRepository.save(mechanic);
        }
        breakdownRequestRepository.save(request);

        return ResponseEntity.ok(Map.of("message", "Breakdown request cancelled successfully"));
    }

    // Get active accepted breakdown requests assigned to owner's garages
    @GetMapping("/assigned")
    public ResponseEntity<?> getAssignedBreakdowns(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"GARAGE_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<Garage> garages = garageRepository.findByUserId(user.getId());
        if (garages.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<Long> garageIds = garages.stream().map(Garage::getId).toList();
        List<BreakdownRequest> history = breakdownRequestRepository.findByAssignedGarageIdIn(garageIds);
        List<BreakdownRequest> assigned = history.stream()
                .filter(r -> "ACCEPTED".equals(r.getStatus()))
                .sorted((a, b) -> b.getCreatedTime().compareTo(a.getCreatedTime()))
                .toList();

        return ResponseEntity.ok(assigned);
    }

    // Get breakdown history (completed rescues) for the owner's garage
    @GetMapping("/history")
    public ResponseEntity<?> getBreakdownHistory(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"GARAGE_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<Garage> garages = garageRepository.findByUserId(user.getId());
        if (garages.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<Long> garageIds = garages.stream().map(Garage::getId).toList();
        List<BreakdownRequest> history = breakdownRequestRepository.findByAssignedGarageIdIn(garageIds);
        List<BreakdownRequest> completed = history.stream()
                .filter(r -> "COMPLETED".equals(r.getStatus()) || "CANCELLED".equals(r.getStatus()))
                .sorted((a, b) -> b.getCreatedTime().compareTo(a.getCreatedTime()))
                .toList();

        return ResponseEntity.ok(completed);
    }

    // Delete a specific completed breakdown request history item
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBreakdown(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<BreakdownRequest> requestOpt = breakdownRequestRepository.findById(id);
        if (requestOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        BreakdownRequest request = requestOpt.get();

        boolean authorized = false;
        if ("ADMIN".equals(user.getRole())) {
            authorized = true;
        } else if ("GARAGE_OWNER".equals(user.getRole())) {
            List<Garage> garages = garageRepository.findByUserId(user.getId());
            if (request.getAssignedGarage() != null && ("COMPLETED".equals(request.getStatus()) || "CANCELLED".equals(request.getStatus()))) {
                authorized = garages.stream().anyMatch(g -> g.getId().equals(request.getAssignedGarage().getId()));
            }
        }

        if (!authorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        breakdownRequestRepository.delete(request);
        return ResponseEntity.ok(Map.of("message", "Breakdown history item deleted successfully"));
    }

    // Clear all completed breakdown history for the owner's garage
    @DeleteMapping("/history/clear")
    public ResponseEntity<?> clearBreakdownHistory(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"GARAGE_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<Garage> garages = garageRepository.findByUserId(user.getId());
        if (garages.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Garage profile not found"));
        }

        List<Long> garageIds = garages.stream().map(Garage::getId).toList();
        List<BreakdownRequest> history = breakdownRequestRepository.findByAssignedGarageIdIn(garageIds);
        List<BreakdownRequest> completed = history.stream()
                .filter(r -> "COMPLETED".equals(r.getStatus()) || "CANCELLED".equals(r.getStatus()))
                .toList();

        breakdownRequestRepository.deleteAll(completed);
        return ResponseEntity.ok(Map.of("message", "All completed breakdown history cleared successfully"));
    }
}
