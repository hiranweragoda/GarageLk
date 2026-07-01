package com.garagefinder.repository;

import com.garagefinder.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByGarageIdOrderByCreatedAtDesc(Long garageId);

    List<Review> findByCustomerId(Long customerId);

    Optional<Review> findByBookingId(Long bookingId);

    boolean existsByBookingId(Long bookingId);

    Optional<Review> findByBreakdownRequestId(Long breakdownRequestId);

    boolean existsByBreakdownRequestId(Long breakdownRequestId);

    @Query("SELECT AVG(r.starRating) FROM Review r WHERE r.garage.id = :garageId")
    Double findAverageRatingByGarageId(@Param("garageId") Long garageId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.garage.id = :garageId")
    Long countByGarageId(@Param("garageId") Long garageId);
}
