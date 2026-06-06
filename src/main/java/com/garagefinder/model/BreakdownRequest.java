package com.garagefinder.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "breakdown_requests")
public class BreakdownRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "location_city", nullable = false)
    private String locationCity; // e.g. Colombo 03, Gampaha, Kandy

    @Column(nullable = false)
    private String status = "OPEN"; // "OPEN", "RESPONDED", "RESOLVED"

    @Column(name = "contact_phone", nullable = false)
    private String contactPhone;

    @Column(name = "created_time", nullable = false)
    private LocalDateTime createdTime = LocalDateTime.now();

    private Double latitude;
    private Double longitude;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_garage_id")
    private Garage assignedGarage;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_mechanic_id")
    private Mechanic assignedMechanic;

    @Column(name = "vehicle_no")
    private String vehicleNo;

    private String address;

    // Constructors
    public BreakdownRequest() {}

    public BreakdownRequest(Customer customer, String description, String locationCity, String status, String contactPhone, Double latitude, Double longitude) {
        this.customer = customer;
        this.description = description;
        this.locationCity = locationCity;
        this.status = status;
        this.contactPhone = contactPhone;
        this.latitude = latitude;
        this.longitude = longitude;
        this.createdTime = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Customer getCustomer() {
        return customer;
    }

    public void setCustomer(Customer customer) {
        this.customer = customer;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLocationCity() {
        return locationCity;
    }

    public void setLocationCity(String locationCity) {
        this.locationCity = locationCity;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public String getPhone() {
        return contactPhone;
    }

    public void setContactPhone(String contactPhone) {
        this.contactPhone = contactPhone;
    }

    public LocalDateTime getCreatedTime() {
        return createdTime;
    }

    public void setCreatedTime(LocalDateTime createdTime) {
        this.createdTime = createdTime;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Garage getAssignedGarage() {
        return assignedGarage;
    }

    public void setAssignedGarage(Garage assignedGarage) {
        this.assignedGarage = assignedGarage;
    }

    public Mechanic getAssignedMechanic() {
        return assignedMechanic;
    }

    public void setAssignedMechanic(Mechanic assignedMechanic) {
        this.assignedMechanic = assignedMechanic;
    }

    public String getVehicleNo() {
        return vehicleNo;
    }

    public void setVehicleNo(String vehicleNo) {
        this.vehicleNo = vehicleNo;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCity() {
        return locationCity;
    }

    public LocalDateTime getCreatedAt() {
        return createdTime;
    }

    public User getUser() {
        return customer != null ? customer.getUser() : null;
    }

    public java.util.Map<String, String> getAcceptedBy() {
        if (assignedGarage == null) {
            return null;
        }
        java.util.Map<String, String> accepted = new java.util.HashMap<>();
        accepted.put("name", assignedGarage.getGarageName());
        accepted.put("phone", assignedGarage.getPhone() != null ? assignedGarage.getPhone() : (assignedGarage.getUser() != null ? assignedGarage.getUser().getPhone() : "N/A"));
        return accepted;
    }
}
