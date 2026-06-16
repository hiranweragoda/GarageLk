package com.garagefinder.repository;

import com.garagefinder.model.SparePartBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SparePartBookingRepository extends JpaRepository<SparePartBooking, Long> {
    List<SparePartBooking> findByCustomerIdOrderByBookingDateDesc(Long customerId);
    List<SparePartBooking> findBySparePartShopIdInOrderByBookingDateDesc(List<Long> shopIds);
}
