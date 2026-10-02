package com.spring.boot.repository;

import com.spring.boot.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for Payment entity.
 */
@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByHotelBookingId(Long hotelBookingId);

    List<Payment> findByBusBookingId(Long busBookingId);
}