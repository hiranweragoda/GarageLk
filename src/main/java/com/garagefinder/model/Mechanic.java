package com.garagefinder.model;

import jakarta.persistence.*;

@Entity
@Table(name = "mechanics")
public class Mechanic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String phone;

    private String specialization;

    @Column(nullable = false)
    private String status = "AVAILABLE"; // "AVAILABLE", "ON_RESCUE"

    @Column(nullable = false)
    private boolean active = true;

    // Constructors
    public Mechanic() {}

    public Mechanic(Garage garage, String name, String phone, String specialization, String status) {
        this.garage = garage;
        this.name = name;
        this.phone = phone;
        this.specialization = specialization;
        this.status = status != null ? status : "AVAILABLE";
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Garage getGarage() {
        return garage;
    }

    public void setGarage(Garage garage) {
        this.garage = garage;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getSpecialization() {
        return specialization;
    }

    public void setSpecialization(String specialization) {
        this.specialization = specialization;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
