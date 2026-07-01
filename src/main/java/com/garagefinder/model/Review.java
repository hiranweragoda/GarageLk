package com.garagefinder.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "booking_id", nullable = true, unique = true)
    private Booking booking;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "breakdown_request_id", nullable = true, unique = true)
    private BreakdownRequest breakdownRequest;

    @Column(name = "star_rating", nullable = false)
    private Integer starRating; // 1 to 5

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Constructors
    public Review() {}

    public Review(User customer, Garage garage, Booking booking, Integer starRating, String comment) {
        this.customer = customer;
        this.garage = garage;
        this.booking = booking;
        this.starRating = starRating;
        this.comment = comment;
        this.createdAt = LocalDateTime.now();
    }

    public Review(User customer, Garage garage, BreakdownRequest breakdownRequest, Integer starRating, String comment) {
        this.customer = customer;
        this.garage = garage;
        this.breakdownRequest = breakdownRequest;
        this.starRating = starRating;
        this.comment = comment;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getCustomer() { return customer; }
    public void setCustomer(User customer) { this.customer = customer; }

    public Garage getGarage() { return garage; }
    public void setGarage(Garage garage) { this.garage = garage; }

    public Booking getBooking() { return booking; }
    public void setBooking(Booking booking) { this.booking = booking; }

    public BreakdownRequest getBreakdownRequest() { return breakdownRequest; }
    public void setBreakdownRequest(BreakdownRequest breakdownRequest) { this.breakdownRequest = breakdownRequest; }

    public Integer getStarRating() { return starRating; }
    public void setStarRating(Integer starRating) { this.starRating = starRating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
