package com.garagefinder.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "shop_reviews")
public class ShopReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "shop_id", nullable = false)
    private SparePartShop shop;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "spare_part_booking_id", nullable = false, unique = true)
    private SparePartBooking sparePartBooking;

    @Column(name = "star_rating", nullable = false)
    private Integer starRating; // 1 to 5

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public ShopReview() {}

    public ShopReview(Customer customer, SparePartShop shop, SparePartBooking sparePartBooking, Integer starRating, String comment) {
        this.customer = customer;
        this.shop = shop;
        this.sparePartBooking = sparePartBooking;
        this.starRating = starRating;
        this.comment = comment;
        this.createdAt = LocalDateTime.now();
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

    public SparePartShop getShop() {
        return shop;
    }

    public void setShop(SparePartShop shop) {
        this.shop = shop;
    }

    public SparePartBooking getSparePartBooking() {
        return sparePartBooking;
    }

    public void setSparePartBooking(SparePartBooking sparePartBooking) {
        this.sparePartBooking = sparePartBooking;
    }

    public Integer getStarRating() {
        return starRating;
    }

    public void setStarRating(Integer starRating) {
        this.starRating = starRating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
