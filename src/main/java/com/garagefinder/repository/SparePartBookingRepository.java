package com.garagefinder.repository;

import com.garagefinder.model.SparePartBooking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SparePartBookingRepository extends JpaRepository<SparePartBooking, Long> {
    Optional<SparePartBooking> findByBookingCode(String bookingCode);
    long countByBookingCodeLike(String pattern);
    List<SparePartBooking> findByCustomerIdOrderByBookingDateDesc(Long customerId);
    List<SparePartBooking> findBySparePartShopIdInOrderByBookingDateDesc(List<Long> shopIds);
}
