package com.garagefinder.model;

import jakarta.persistence.*;

@Entity
@Table(name = "spare_parts")
public class SparePart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "shop_id", nullable = false)
    private SparePartShop shop;

    @Column(name = "part_name", nullable = false)
    private String partName;

    @Column(name = "vehicle_model", nullable = false)
    private String vehicleModel;

    @Column(name = "vehicle_year", nullable = false)
    private Integer vehicleYear;

    @Column(nullable = false)
    private Double price;

    @Column(nullable = false)
    private Integer quantity = 1;

    @Column(nullable = false)
    private String status = "IN_STOCK"; // "IN_STOCK", "OUT_OF_STOCK"

    @Column(name = "image_url")
    private String imageUrl;

    public SparePart() {}

    public SparePart(SparePartShop shop, String partName, String vehicleModel, Integer vehicleYear, Double price, Integer quantity) {
        this.shop = shop;
        this.partName = partName;
        this.vehicleModel = vehicleModel;
        this.vehicleYear = vehicleYear;
        this.price = price;
        this.quantity = quantity;
        this.status = (quantity > 0) ? "IN_STOCK" : "OUT_OF_STOCK";
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public SparePartShop getShop() {
        return shop;
    }

    public void setShop(SparePartShop shop) {
        this.shop = shop;
    }

    public String getPartName() {
        return partName;
    }

    public void setPartName(String partName) {
        this.partName = partName;
    }

    public String getVehicleModel() {
        return vehicleModel;
    }

    public void setVehicleModel(String vehicleModel) {
        this.vehicleModel = vehicleModel;
    }

    public Integer getVehicleYear() {
        return vehicleYear;
    }

    public void setVehicleYear(Integer vehicleYear) {
        this.vehicleYear = vehicleYear;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
        this.status = (quantity > 0) ? "IN_STOCK" : "OUT_OF_STOCK";
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}
