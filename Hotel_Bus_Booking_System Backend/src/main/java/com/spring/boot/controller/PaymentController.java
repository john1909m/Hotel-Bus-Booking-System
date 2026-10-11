package com.spring.boot.controller;

import com.spring.boot.dto.PaymentDto;
import com.spring.boot.dto.PaymentRequestDto;
import com.spring.boot.enums.Role;

import com.spring.boot.service.interfaces.BusBookingService;
import com.spring.boot.service.interfaces.HotelBookingService;
import com.spring.boot.service.interfaces.PaymentService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for Payment entity.
 */
@RestController
@RequestMapping("/api/payments")
@AllArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final HotelBookingService hotelBookingService;
    private final BusBookingService busBookingService;

    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<PaymentDto> createPayment(@RequestBody PaymentRequestDto paymentRequestDto) {
        PaymentDto createdPayment = paymentService.createPayment(paymentRequestDto);
        return new ResponseEntity<>(createdPayment, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @PreAuthorize("( #paymentServiceImpl.getPaymentById(#id).getHotelBooking() != null and #paymentServiceImpl.getPaymentById(#id).getHotelBooking().getUser().getId() == authentication.principal.id ) or ( #paymentServiceImpl.getPaymentById(#id).getBusBooking() != null and #paymentServiceImpl.getPaymentById(#id).getBusBooking().getUser().getId() == authentication.principal.id ) or hasRole('ADMIN')")
    public ResponseEntity<PaymentDto> getPaymentById(@PathVariable Long id) {
        PaymentDto payment = paymentService.getPaymentById(id);
        return new ResponseEntity<>(payment, HttpStatus.OK);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PaymentDto>> getAllPayments() {
        List<PaymentDto> payments = paymentService.getAllPayments();
        return new ResponseEntity<>(payments, HttpStatus.OK);
    }

    @GetMapping("/hotel-booking/{hotelBookingId}")
    @PreAuthorize("#hotelBookingServiceImpl.getHotelBookingById(#hotelBookingId).getUser().getId() == authentication.principal.id or hasRole('ADMIN')")
    public ResponseEntity<List<PaymentDto>> getPaymentsByHotelBookingId(@PathVariable Long hotelBookingId) {
        List<PaymentDto> payments = paymentService.getPaymentsByHotelBookingId(hotelBookingId);
        return new ResponseEntity<>(payments, HttpStatus.OK);
    }

    @GetMapping("/bus-booking/{busBookingId}")
    @PreAuthorize("#busBookingServiceImpl.getBusBookingById(#busBookingId).getUser().getId() == authentication.principal.id or hasRole('ADMIN')")
    public ResponseEntity<List<PaymentDto>> getPaymentsByBusBookingId(@PathVariable Long busBookingId) {
        List<PaymentDto> payments = paymentService.getPaymentsByBusBookingId(busBookingId);
        return new ResponseEntity<>(payments, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    @PreAuthorize("( #paymentServiceImpl.getPaymentById(#id).getHotelBooking() != null and #paymentServiceImpl.getPaymentById(#id).getHotelBooking().getUser().getId() == authentication.principal.id ) or ( #paymentServiceImpl.getPaymentById(#id).getBusBooking() != null and #paymentServiceImpl.getPaymentById(#id).getBusBooking().getUser().getId() == authentication.principal.id ) or hasRole('ADMIN')")
    public ResponseEntity<PaymentDto> updatePayment(@PathVariable Long id,  @RequestBody PaymentRequestDto paymentRequestDto) {
        PaymentDto updatedPayment = paymentService.updatePayment(id, paymentRequestDto);
        return new ResponseEntity<>(updatedPayment, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("( #paymentServiceImpl.getPaymentById(#id).getHotelBooking() != null and #paymentServiceImpl.getPaymentById(#id).getHotelBooking().getUser().getId() == authentication.principal.id ) or ( #paymentServiceImpl.getPaymentById(#id).getBusBooking() != null and #paymentServiceImpl.getPaymentById(#id).getBusBooking().getUser().getId() == authentication.principal.id ) or hasRole('ADMIN')")
    public ResponseEntity<Void> deletePayment(@PathVariable Long id) {
        paymentService.deletePayment(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}