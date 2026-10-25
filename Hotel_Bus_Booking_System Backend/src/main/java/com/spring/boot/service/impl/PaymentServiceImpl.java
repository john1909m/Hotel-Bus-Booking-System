package com.spring.boot.service.impl;

import com.spring.boot.dto.PaymentDto;
import com.spring.boot.dto.PaymentRequestDto;
import com.spring.boot.enums.PaymentStatus;
import com.spring.boot.exception.BookingConflictException;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.helper.SecurityUtils;
import com.spring.boot.model.Payment;
import com.spring.boot.model.HotelBooking;
import com.spring.boot.model.BusBooking;
import com.spring.boot.mapper.PaymentMapper;
import com.spring.boot.repository.PaymentRepository;
import com.spring.boot.repository.HotelBookingRepository;
import com.spring.boot.repository.BusBookingRepository;
import com.spring.boot.service.interfaces.PaymentService;
import lombok.AllArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service implementation for Payment entity with ownership enforcement and pessimistic locking.
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
    @Transactional
    public PaymentDto createPayment(PaymentRequestDto paymentRequestDto) {
        HotelBooking hotelBooking = null;
        if (paymentRequestDto.getHotelBookingId() != null) {
            // Pessimistic lock on booking row to serialize concurrent payment creation
            hotelBooking = hotelBookingRepository.findByIdForUpdate(paymentRequestDto.getHotelBookingId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_booking_not_found")));

            // Only one successful payment per booking
            if (paymentRepository.existsByHotelBookingIdAndPaymentStatus(hotelBooking.getId(), PaymentStatus.COMPLETED)) {
                throw new BookingConflictException(bundleMessageService.getMessage("error.payment_already_completed"));
            }
        }

        BusBooking busBooking = null;
        if (paymentRequestDto.getBusBookingId() != null) {
            // Pessimistic lock on booking row to serialize concurrent payment creation
            busBooking = busBookingRepository.findByIdForUpdate(paymentRequestDto.getBusBookingId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_booking_not_found")));

            // Only one successful payment per booking
            if (paymentRepository.existsByBusBookingIdAndPaymentStatus(busBooking.getId(), PaymentStatus.COMPLETED)) {
                throw new BookingConflictException(bundleMessageService.getMessage("error.payment_already_completed"));
            }
        }

        Payment payment = paymentMapper.paymentRequestDtoToPayment(paymentRequestDto);
        payment.setHotelBooking(hotelBooking);
        payment.setBusBooking(busBooking);
        Payment savedPayment = paymentRepository.save(payment);
        return paymentMapper.paymentToPaymentDto(savedPayment);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentDto getPaymentById(Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.payment_not_found")));

        Long ownerUserId = getPaymentOwnerUserId(payment);
        if (!SecurityUtils.isOwnerOrAdmin(ownerUserId)) {
            // Do not reveal existence on read
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.payment_not_found"));
        }

        return paymentMapper.paymentToPaymentDto(payment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentDto> getAllPayments() {
        return paymentRepository.findAll().stream()
                .map(paymentMapper::paymentToPaymentDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentDto> getPaymentsByHotelBookingId(Long hotelBookingId) {
        HotelBooking booking = hotelBookingRepository.findById(hotelBookingId)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_booking_not_found")));

        if (!SecurityUtils.isOwnerOrAdmin(booking.getUser() != null ? booking.getUser().getId() : null)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_booking_not_found"));
        }

        return paymentRepository.findByHotelBookingId(hotelBookingId).stream()
                .map(paymentMapper::paymentToPaymentDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentDto> getPaymentsByBusBookingId(Long busBookingId) {
        BusBooking booking = busBookingRepository.findById(busBookingId)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_booking_not_found")));

        if (!SecurityUtils.isOwnerOrAdmin(booking.getUser() != null ? booking.getUser().getId() : null)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_booking_not_found"));
        }

        return paymentRepository.findByBusBookingId(busBookingId).stream()
                .map(paymentMapper::paymentToPaymentDto)
                .toList();
    }

    @Override
    @Transactional
    public PaymentDto updatePayment(Long id, PaymentRequestDto paymentRequestDto) {
        Payment existingPayment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.payment_not_found")));

        Long ownerUserId = getPaymentOwnerUserId(existingPayment);
        if (!SecurityUtils.isOwnerOrAdmin(ownerUserId)) {
            throw new AccessDeniedException(bundleMessageService.getMessage("error.access_denied"));
        }

        HotelBooking hotelBooking = null;
        if (paymentRequestDto.getHotelBookingId() != null) {
            hotelBooking = hotelBookingRepository.findById(paymentRequestDto.getHotelBookingId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_booking_not_found")));
        }

        BusBooking busBooking = null;
        if (paymentRequestDto.getBusBookingId() != null) {
            busBooking = busBookingRepository.findById(paymentRequestDto.getBusBookingId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_booking_not_found")));
        }

        existingPayment.setAmount(paymentRequestDto.getAmount());
        existingPayment.setPaymentMethod(paymentRequestDto.getPaymentMethod());
        existingPayment.setPaymentStatus(paymentRequestDto.getPaymentStatus());
        existingPayment.setTransactionDate(paymentRequestDto.getTransactionDate());

        if (hotelBooking != null) {
            existingPayment.setHotelBooking(hotelBooking);
        }
        if (busBooking != null) {
            existingPayment.setBusBooking(busBooking);
        }

        Payment updatedPayment = paymentRepository.save(existingPayment);
        return paymentMapper.paymentToPaymentDto(updatedPayment);
    }

    @Override
    @Transactional
    public void deletePayment(Long id) {
        Payment existingPayment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.payment_not_found")));

        Long ownerUserId = getPaymentOwnerUserId(existingPayment);
        if (!SecurityUtils.isOwnerOrAdmin(ownerUserId)) {
            throw new AccessDeniedException(bundleMessageService.getMessage("error.access_denied"));
        }

        paymentRepository.delete(existingPayment);
    }

    private Long getPaymentOwnerUserId(Payment payment) {
        if (payment.getHotelBooking() != null && payment.getHotelBooking().getUser() != null) {
            return payment.getHotelBooking().getUser().getId();
        }
        if (payment.getBusBooking() != null && payment.getBusBooking().getUser() != null) {
            return payment.getBusBooking().getUser().getId();
        }
        return null;
    }
}