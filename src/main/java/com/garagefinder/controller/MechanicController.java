package com.garagefinder.controller;

import com.garagefinder.model.Garage;
import com.garagefinder.model.Mechanic;
import com.garagefinder.model.User;
import com.garagefinder.repository.GarageRepository;
import com.garagefinder.repository.MechanicRepository;
import com.garagefinder.model.BreakdownRequest;
import com.garagefinder.repository.BreakdownRequestRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/mechanics")
public class MechanicController {

    private final MechanicRepository mechanicRepository;
    private final GarageRepository garageRepository;
    private final BreakdownRequestRepository breakdownRequestRepository;

    public MechanicController(MechanicRepository mechanicRepository, GarageRepository garageRepository, BreakdownRequestRepository breakdownRequestRepository) {
        this.mechanicRepository = mechanicRepository;
        this.garageRepository = garageRepository;
        this.breakdownRequestRepository = breakdownRequestRepository;
    }

    // Get mechanics for the logged-in owner's garage
    @GetMapping
    public ResponseEntity<?> getMyMechanics(@RequestParam(required = false) Long garageId, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"GARAGE_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<Garage> garages = garageRepository.findByUserId(user.getId());
        if (garages.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        if (garageId != null) {
            Optional<Garage> targetGarage = garages.stream().filter(g -> g.getId().equals(garageId)).findFirst();
            if (targetGarage.isEmpty()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
            }
            List<Mechanic> mechanics = mechanicRepository.findByGarageId(garageId);
            return ResponseEntity.ok(mechanics);
        } else {
            List<Long> garageIds = garages.stream().map(g -> g.getId()).toList();
            List<Mechanic> mechanics = mechanicRepository.findByGarageIdIn(garageIds);
            return ResponseEntity.ok(mechanics);
        }
    }

    // Get available mechanics for a specific garage (can be called by owners or admins)
    @GetMapping("/available")
    public ResponseEntity<?> getAvailableMechanics(@RequestParam Long garageId, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<Mechanic> mechanics = mechanicRepository.findByGarageIdAndStatus(garageId, "AVAILABLE");
        List<Mechanic> activeAvailable = mechanics.stream().filter(m -> m.isActive()).toList();
        return ResponseEntity.ok(activeAvailable);
    }

    // Add a mechanic
    @PostMapping
    public ResponseEntity<?> addMechanic(@RequestBody Map<String, Object> payload, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"GARAGE_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        if (!payload.containsKey("garageId") || payload.get("garageId") == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "garageId is required"));
        }
        Long garageId = Long.parseLong(payload.get("garageId").toString());
        Optional<Garage> garageOpt = garageRepository.findById(garageId);
        if (garageOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Garage profile not found"));
        }
        if (!garageOpt.get().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        String name = payload.get("name") != null ? payload.get("name").toString() : null;
        String phone = payload.get("phone") != null ? payload.get("phone").toString() : null;
        String specialization = payload.get("specialization") != null ? payload.get("specialization").toString() : null;
        String status = payload.containsKey("status") && payload.get("status") != null ? payload.get("status").toString() : "AVAILABLE";

        if (name == null || name.trim().isEmpty() || phone == null || phone.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Name and Phone are required"));
        }

        Mechanic mechanic = new Mechanic(garageOpt.get(), name, phone, specialization, status);
        mechanicRepository.save(mechanic);

        return ResponseEntity.ok(Map.of("message", "Mechanic added successfully"));
    }

    // Update a mechanic
    @PutMapping("/{id}")
    public ResponseEntity<?> updateMechanic(@PathVariable Long id, @RequestBody Map<String, Object> payload, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"GARAGE_OWNER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<Mechanic> mechanicOpt = mechanicRepository.findById(id);
        if (mechanicOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Mechanic mechanic = mechanicOpt.get();
        if (!mechanic.getGarage().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        String name = payload.get("name") != null ? payload.get("name").toString() : null;
        String phone = payload.get("phone") != null ? payload.get("phone").toString() : null;
        String specialization = payload.get("specialization") != null ? payload.get("specialization").toString() : null;
        String status = payload.get("status") != null ? payload.get("status").toString() : null;

        if (name == null || name.trim().isEmpty() || phone == null || phone.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Name and Phone are required"));
        }

        mechanic.setName(name);
        mechanic.setPhone(phone);
        mechanic.setSpecialization(specialization);
        if (status != null) {
            mechanic.setStatus(status);
        }

        mechanicRepository.save(mechanic);
        return ResponseEntity.ok(Map.of("message", "Mechanic updated successfully"));
    }

    // Get all mechanics in the system (ADMIN only)
    @GetMapping("/all")
    public ResponseEntity<?> getAllMechanics(HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        return ResponseEntity.ok(mechanicRepository.findAll());
    }

    @PostMapping("/admin/toggle-active/{id}")
    public ResponseEntity<?> toggleMechanicActive(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<Mechanic> mechOpt = mechanicRepository.findById(id);
        if (mechOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Mechanic mechanic = mechOpt.get();
        mechanic.setActive(!mechanic.isActive());
        mechanicRepository.save(mechanic);

        return ResponseEntity.ok(Map.of(
            "message", "Mechanic status updated successfully",
            "active", mechanic.isActive()
        ));
    }

    // Delete a mechanic
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMechanic(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("LOGGED_IN_USER");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<Mechanic> mechanicOpt = mechanicRepository.findById(id);
        if (mechanicOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Mechanic mechanic = mechanicOpt.get();

        // Admin override
        if ("ADMIN".equals(user.getRole())) {
            cleanUpBreakdownRequestsForMechanic(id);
            mechanicRepository.delete(mechanic);
            return ResponseEntity.ok(Map.of("message", "Mechanic profile deleted successfully by admin"));
        }

        // Owner validation
        if (!"GARAGE_OWNER".equals(user.getRole()) || !mechanic.getGarage().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        cleanUpBreakdownRequestsForMechanic(id);
        mechanicRepository.delete(mechanic);
        return ResponseEntity.ok(Map.of("message", "Mechanic deleted successfully"));
    }

    private void cleanUpBreakdownRequestsForMechanic(Long mechanicId) {
        List<BreakdownRequest> breakdowns = breakdownRequestRepository.findAll();
        for (BreakdownRequest br : breakdowns) {
            if (br.getAssignedMechanic() != null && br.getAssignedMechanic().getId().equals(mechanicId)) {
                br.setAssignedMechanic(null);
                breakdownRequestRepository.save(br);
            }
        }
    }
}
