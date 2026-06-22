package com.garagefinder.model;

import jakarta.persistence.*;

@Entity
@Table(name = "garages")
public class Garage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false)
    private User user;

    @Column(name = "garage_name", nullable = false)
    private String garageName;

    @Column(name = "owner_name", nullable = false)
    private String ownerName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private String city; // e.g. Colombo 03, Gampaha, Kandy

    @Column(nullable = false)
    private String district; // e.g. Colombo, Gampaha, Kandy, Galle

    @Column(nullable = false)
    private String status = "PENDING"; // "PENDING", "APPROVED", "REJECTED"

    private Double latitude;
    private Double longitude;

    @Column(name = "vehicle_types")
    private String vehicleTypes; // e.g. "Car,Bike,Van"

    @Column(name = "engine_types")
    private String engineTypes; // e.g. "Petrol,Diesel,Hybrid,EV"

    @Column(name = "image_url")
    private String imageUrl;

    private String phone;

    private String email;

    @Column(name = "open_time")
    private String openTime;

    @Column(name = "close_time")
    private String closeTime;

    @Column(name = "open_days")
    private String openDays;

    @Column(name = "open_today")
    private Boolean openToday = true;

    // Constructors
    public Garage() {}

    public Garage(User user, String garageName, String ownerName, String description, String address, String city, String district, Double latitude, Double longitude) {
        this.user = user;
        this.garageName = garageName;
        this.ownerName = ownerName;
        this.description = description;
        this.address = address;
        this.city = city;
        this.district = district;
        this.status = "PENDING";
        this.latitude = latitude;
        this.longitude = longitude;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public User getOwner() {
        return user;
    }

    public String getGarageName() {
        return garageName;
    }

    public void setGarageName(String garageName) {
        this.garageName = garageName;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
    }

    public String getStatus() {
        return "PENDING".equals(status) ? "PENDING_APPROVAL" : status;
    }

    public void setStatus(String status) {
        this.status = status;
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

    public String getVehicleTypes() {
        return vehicleTypes;
    }

    public void setVehicleTypes(String vehicleTypes) {
        this.vehicleTypes = vehicleTypes;
    }

    public String getEngineTypes() {
        return engineTypes;
    }

    public void setEngineTypes(String engineTypes) {
        this.engineTypes = engineTypes;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return garageName;
    }

    public String getOpenTime() {
        return openTime;
    }

    public void setOpenTime(String openTime) {
        this.openTime = openTime;
    }

    public String getCloseTime() {
        return closeTime;
    }

    public void setCloseTime(String closeTime) {
        this.closeTime = closeTime;
    }

    public String getOpenDays() {
        return openDays;
    }

    public void setOpenDays(String openDays) {
        this.openDays = openDays;
    }

    public Boolean getOpenToday() {
        return openToday;
    }

    public void setOpenToday(Boolean openToday) {
        this.openToday = openToday;
    }
}
