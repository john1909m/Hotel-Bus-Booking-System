package com.spring.boot.service.interfaces;

import com.spring.boot.dto.PaymentDto;
import com.spring.boot.dto.PaymentRequestDto;

import java.util.List;


/**
 * Service interface for Payment entity.
 */
public interface PaymentService {

    PaymentDto createPayment(PaymentRequestDto paymentRequestDto);

    PaymentDto getPaymentById(Long id);

    List<PaymentDto> getAllPayments();

    List<PaymentDto> getPaymentsByHotelBookingId(Long hotelBookingId);

    List<PaymentDto> getPaymentsByBusBookingId(Long busBookingId);

    PaymentDto updatePayment(Long id, PaymentRequestDto paymentRequestDto);

    void deletePayment(Long id);
}