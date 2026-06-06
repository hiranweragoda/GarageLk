package com.garagefinder.repository;

import com.garagefinder.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByGarageIdOrderByCreatedAtDesc(Long garageId);

    Optional<Review> findByBookingId(Long bookingId);

    boolean existsByBookingId(Long bookingId);

    @Query("SELECT AVG(r.starRating) FROM Review r WHERE r.garage.id = :garageId")
    Double findAverageRatingByGarageId(@Param("garageId") Long garageId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.garage.id = :garageId")
    Long countByGarageId(@Param("garageId") Long garageId);
}
