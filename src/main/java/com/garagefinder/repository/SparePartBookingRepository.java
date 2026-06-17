package com.garagefinder.repository;

import com.garagefinder.model.SparePartBooking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SparePartBookingRepository extends JpaRepository<SparePartBooking, Long> {
    List<SparePartBooking> findByCustomerIdOrderByBookingDateDesc(Long customerId);
    List<SparePartBooking> findBySparePartShopIdInOrderByBookingDateDesc(List<Long> shopIds);
}
