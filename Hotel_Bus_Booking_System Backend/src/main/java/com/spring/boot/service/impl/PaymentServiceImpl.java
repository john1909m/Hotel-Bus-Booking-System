package com.spring.boot.service.impl;

import com.spring.boot.dto.PaymentDto;
import com.spring.boot.dto.PaymentRequestDto;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.Payment;
import com.spring.boot.model.HotelBooking;
import com.spring.boot.model.BusBooking;
import com.spring.boot.mapper.PaymentMapper;
import com.spring.boot.repository.PaymentRepository;
import com.spring.boot.repository.HotelBookingRepository;
import com.spring.boot.repository.BusBookingRepository;
import com.spring.boot.service.interfaces.PaymentService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;


/**
 * Service implementation for Payment entity.
 */
@Service
@AllArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentMapper paymentMapper;
    private final HotelBookingRepository hotelBookingRepository;
    private final BusBookingRepository busBookingRepository;
    private final BundleMessageService bundleMessageService;

    @Override
    public PaymentDto createPayment(PaymentRequestDto paymentRequestDto) {
        // Validate that hotel booking exists if provided
        HotelBooking hotelBooking = null;
        if (paymentRequestDto.getHotelBookingId() != null) {
            hotelBooking = hotelBookingRepository.findById(paymentRequestDto.getHotelBookingId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_booking_not_found")));
        }

        // Validate that bus booking exists if provided
        BusBooking busBooking = null;
        if (paymentRequestDto.getBusBookingId() != null) {
            busBooking = busBookingRepository.findById(paymentRequestDto.getBusBookingId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_booking_not_found")));
        }

        Payment payment = paymentMapper.paymentRequestDtoToPayment(paymentRequestDto);
        payment.setHotelBooking(hotelBooking);
        payment.setBusBooking(busBooking);
        Payment savedPayment = paymentRepository.save(payment);
        return paymentMapper.paymentToPaymentDto(savedPayment);
    }

    @Override
    public PaymentDto getPaymentById(Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.payment_not_found")));
        return paymentMapper.paymentToPaymentDto(payment);
    }

    @Override
    public java.util.List<PaymentDto> getAllPayments() {
        return paymentRepository.findAll().stream()
                .map(paymentMapper::paymentToPaymentDto)
                .toList();
    }

    @Override
    public java.util.List<PaymentDto> getPaymentsByHotelBookingId(Long hotelBookingId) {
        return paymentRepository.findByHotelBookingId(hotelBookingId).stream()
                .map(paymentMapper::paymentToPaymentDto)
                .toList();
    }

    @Override
    public java.util.List<PaymentDto> getPaymentsByBusBookingId(Long busBookingId) {
        return paymentRepository.findByBusBookingId(busBookingId).stream()
                .map(paymentMapper::paymentToPaymentDto)
                .toList();
    }

    @Override
    public PaymentDto updatePayment(Long id, PaymentRequestDto paymentRequestDto) {
        Payment existingPayment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.payment_not_found")));

        // Validate that hotel booking exists if provided
        HotelBooking hotelBooking = null;
        if (paymentRequestDto.getHotelBookingId() != null) {
            hotelBooking = hotelBookingRepository.findById(paymentRequestDto.getHotelBookingId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_booking_not_found")));
        }

        // Validate that bus booking exists if provided
        BusBooking busBooking = null;
        if (paymentRequestDto.getBusBookingId() != null) {
            busBooking = busBookingRepository.findById(paymentRequestDto.getBusBookingId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_booking_not_found")));
        }

        // Update fields
        existingPayment.setAmount(paymentRequestDto.getAmount());
        existingPayment.setPaymentMethod(paymentRequestDto.getPaymentMethod());
        existingPayment.setPaymentStatus(paymentRequestDto.getPaymentStatus());
        existingPayment.setTransactionDate(paymentRequestDto.getTransactionDate());

        // Handle hotel booking relationship: if provided, validate and set; if not provided, keep existing
        if (hotelBooking != null) {
            existingPayment.setHotelBooking(hotelBooking);
        }

        // Handle bus booking relationship: if provided, validate and set; if not provided, keep existing
        if (busBooking != null) {
            existingPayment.setBusBooking(busBooking);
        }

        // Save payment
        Payment updatedPayment = paymentRepository.save(existingPayment);

        // Return DTO
        return paymentMapper.paymentToPaymentDto(updatedPayment);
    }

    @Override
    public void deletePayment(Long id) {
        if (!paymentRepository.existsById(id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.payment_not_found"));
        }
        paymentRepository.deleteById(id);
    }
}