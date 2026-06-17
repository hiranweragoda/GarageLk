package com.garagefinder.repository;

import com.garagefinder.model.ShopReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ShopReviewRepository extends JpaRepository<ShopReview, Long> {
    List<ShopReview> findByShopIdOrderByCreatedAtDesc(Long shopId);
    Optional<ShopReview> findBySparePartBookingId(Long bookingId);
    boolean existsBySparePartBookingId(Long bookingId);

    @Query("SELECT AVG(sr.starRating) FROM ShopReview sr WHERE sr.shop.id = :shopId")
    Double findAverageRatingByShopId(@Param("shopId") Long shopId);

    @Query("SELECT COUNT(sr) FROM ShopReview sr WHERE sr.shop.id = :shopId")
    Long countByShopId(@Param("shopId") Long shopId);
}
