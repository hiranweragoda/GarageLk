package com.garagefinder.repository;

import com.garagefinder.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    Optional<Booking> findByBookingCode(String bookingCode);
    long countByBookingCodeLike(String pattern);
    List<Booking> findByCustomerId(Long customerId);
    List<Booking> findByCustomerIdOrderByBookingDateDesc(Long customerId);
    List<Booking> findByGarageId(Long garageId);
    List<Booking> findByGarageIdOrderByBookingDateDesc(Long garageId);
    List<Booking> findByGarageIdInOrderByBookingDateDesc(List<Long> garageIds);

    // Time-slot conflict check: find any PENDING or CONFIRMED booking at same garage within ±1 hour window
    @Query("SELECT b FROM Booking b WHERE b.garage.id = :garageId " +
           "AND b.status IN ('PENDING', 'CONFIRMED') " +
           "AND b.bookingDate BETWEEN :start AND :end")
    List<Booking> findConflictingBookings(
        @Param("garageId") Long garageId,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    );
}
