package com.spring.boot.controller;

import com.spring.boot.dto.PaymentDto;
import com.spring.boot.dto.PaymentRequestDto;
import com.spring.boot.service.interfaces.PaymentService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    @PostMapping
    public ResponseEntity<PaymentDto> createPayment(@RequestBody PaymentRequestDto paymentRequestDto) {
        PaymentDto createdPayment = paymentService.createPayment(paymentRequestDto);
        return new ResponseEntity<>(createdPayment, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PaymentDto> getPaymentById(@PathVariable Long id) {
        PaymentDto payment = paymentService.getPaymentById(id);
        return new ResponseEntity<>(payment, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<List<PaymentDto>> getAllPayments() {
        List<PaymentDto> payments = paymentService.getAllPayments();
        return new ResponseEntity<>(payments, HttpStatus.OK);
    }

    @GetMapping("/hotel-booking/{hotelBookingId}")
    public ResponseEntity<List<PaymentDto>> getPaymentsByHotelBookingId(@PathVariable Long hotelBookingId) {
        List<PaymentDto> payments = paymentService.getPaymentsByHotelBookingId(hotelBookingId);
        return new ResponseEntity<>(payments, HttpStatus.OK);
    }

    @GetMapping("/bus-booking/{busBookingId}")
    public ResponseEntity<List<PaymentDto>> getPaymentsByBusBookingId(@PathVariable Long busBookingId) {
        List<PaymentDto> payments = paymentService.getPaymentsByBusBookingId(busBookingId);
        return new ResponseEntity<>(payments, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PaymentDto> updatePayment(@PathVariable Long id,  @RequestBody PaymentRequestDto paymentRequestDto) {
        PaymentDto updatedPayment = paymentService.updatePayment(id, paymentRequestDto);
        return new ResponseEntity<>(updatedPayment, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePayment(@PathVariable Long id) {
        paymentService.deletePayment(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}