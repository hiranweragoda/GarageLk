package com.garagefinder.repository;

import com.garagefinder.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByBookingIdAndBookingType(Long bookingId, String bookingType);
}
