package com.spring.boot.repository;

import com.spring.boot.enums.PaymentStatus;
import com.spring.boot.model.Payment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for Payment entity with eager fetching to avoid N+1 queries.
 */
@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    @EntityGraph(attributePaths = {"hotelBooking", "busBooking"})
    Optional<Payment> findById(Long id);

    @EntityGraph(attributePaths = {"hotelBooking", "busBooking"})
    List<Payment> findAll();

    @EntityGraph(attributePaths = {"hotelBooking", "busBooking"})
    List<Payment> findByHotelBookingId(Long hotelBookingId);

    @EntityGraph(attributePaths = {"hotelBooking", "busBooking"})
    List<Payment> findByBusBookingId(Long busBookingId);

    boolean existsByHotelBookingIdAndPaymentStatus(Long hotelBookingId, PaymentStatus paymentStatus);

    boolean existsByBusBookingIdAndPaymentStatus(Long busBookingId, PaymentStatus paymentStatus);
}