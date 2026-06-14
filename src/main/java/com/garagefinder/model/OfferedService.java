package com.garagefinder.model;

import jakarta.persistence.*;

@Entity
@Table(name = "offered_services")
public class OfferedService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @Column(name = "service_type", nullable = false)
    private String serviceType; // General Service, Engine Repair, Tire/Wheel Alignment, Towing, Electrical, AC Repair

    @Column(nullable = false)
    private Double price;

    @Column(name = "description", length = 500)
    private String description;

    // Constructors
    public OfferedService() {}

    public OfferedService(Garage garage, String serviceType, Double price) {
        this.garage = garage;
        this.serviceType = serviceType;
        this.price = price;
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

    public String getServiceType() {
        return serviceType;
    }

    public void setServiceType(String serviceType) {
        this.serviceType = serviceType;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public String getServiceName() {
        return serviceType;
    }

    public String getDescription() {
        return description != null ? description : "Automotive service offered by our garage.";
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
