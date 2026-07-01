package com.garagefinder.repository;

import com.garagefinder.model.SparePartBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SparePartBookingRepository extends JpaRepository<SparePartBooking, Long> {
    Optional<SparePartBooking> findByBookingCode(String bookingCode);
    long countByBookingCodeLike(String pattern);
    List<SparePartBooking> findByCustomerIdOrderByBookingDateDesc(Long customerId);

    @Query("SELECT b FROM SparePartBooking b JOIN b.sparePart sp JOIN sp.shop s WHERE s.id IN :shopIds ORDER BY b.bookingDate DESC")
    List<SparePartBooking> findBySparePartShopIdInOrderByBookingDateDesc(@Param("shopIds") List<Long> shopIds);
}
