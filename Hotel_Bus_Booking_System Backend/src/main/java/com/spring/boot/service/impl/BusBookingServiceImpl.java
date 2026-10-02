package com.spring.boot.service.impl;

import com.spring.boot.dto.BusBookingDto;
import com.spring.boot.dto.BusBookingRequestDto;
import com.spring.boot.exception.InvalidSeatException;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.exception.SeatAlreadyBookedException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.BusBooking;
import com.spring.boot.mapper.BusBookingMapper;
import com.spring.boot.repository.BusBookingRepository;
import com.spring.boot.repository.BusRepository;
import com.spring.boot.repository.BusSeatRepository;
import com.spring.boot.repository.BusTripRepository;
import com.spring.boot.service.interfaces.BusBookingService;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;


import java.util.stream.Collectors;

/**
 * Service implementation for BusBooking entity.
 */
@Service
@AllArgsConstructor
public class BusBookingServiceImpl implements BusBookingService {

    private final BusBookingRepository busBookingRepository;
    private final BusBookingMapper busBookingMapper;
    private final BusTripRepository busTripRepository;
    private final BusSeatRepository busSeatRepository;
    private final BusRepository busRepository;
    private final BundleMessageService bundleMessageService;

    @Override
    public BusBookingDto createBusBooking(BusBookingRequestDto busBookingRequestDto) {
        // Validate that user exists (we would typically check this, but skipping for brevity)
        // Validate that bus trip exists
        var busTrip = busTripRepository.findById(busBookingRequestDto.getBusTripId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_trip_not_found")));

        // Validate that seat exists
        var seat = busSeatRepository.findById(busBookingRequestDto.getSeatId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_seat_not_found")));

        // Validate that seat belongs to the bus assigned to the trip
        if (!seat.getBus().getId().equals(busTrip.getBus().getId())) {
            throw new InvalidSeatException(bundleMessageService.getMessage("error.seat_does_not_belong_to_bus"));
        }

        // Check seat availability
        if (!isSeatAvailable(busBookingRequestDto.getBusTripId(), busBookingRequestDto.getSeatId())) {
            throw new SeatAlreadyBookedException(bundleMessageService.getMessage("error.seat_already_booked"));
        }

        // Map DTO to entity
        BusBooking busBooking = busBookingMapper.busBookingRequestDtoToBusBooking(busBookingRequestDto);

        // Save booking
        BusBooking savedBusBooking = busBookingRepository.save(busBooking);

        // Return DTO
        return busBookingMapper.busBookingToBusBookingDto(savedBusBooking);
    }

    @Override
    public BusBookingDto getBusBookingById(Long id) {
        BusBooking busBooking = busBookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_booking_not_found")));
        return busBookingMapper.busBookingToBusBookingDto(busBooking);
    }

    @Override
    public java.util.List<BusBookingDto> getAllBusBookings() {
        return busBookingRepository.findAll().stream()
                .map(busBookingMapper::busBookingToBusBookingDto)
                .collect(Collectors.toList());
    }

    @Override
    public java.util.List<BusBookingDto> getBusBookingsByUserId(Long userId) {
        return busBookingRepository.findByUserId(userId).stream()
                .map(busBookingMapper::busBookingToBusBookingDto)
                .collect(Collectors.toList());
    }

    @Override
    public java.util.List<BusBookingDto> getBusBookingsByBusTripId(Long busTripId) {
        return busBookingRepository.findByBusTripId(busTripId).stream()
                .map(busBookingMapper::busBookingToBusBookingDto)
                .collect(Collectors.toList());
    }

    @Override
    public BusBookingDto updateBusBooking(Long id, BusBookingRequestDto busBookingRequestDto) {
        BusBooking existingBusBooking = busBookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_booking_not_found")));

        // Validate that bus trip exists
        var busTrip = busTripRepository.findById(busBookingRequestDto.getBusTripId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_trip_not_found")));

        // Validate that seat exists
        var seat = busSeatRepository.findById(busBookingRequestDto.getSeatId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_seat_not_found")));

        // Validate that seat belongs to the bus assigned to the trip
        if (!seat.getBus().getId().equals(busTrip.getBus().getId())) {
            throw new InvalidSeatException(bundleMessageService.getMessage("error.seat_does_not_belong_to_bus"));
        }

        // Check seat availability (excluding current booking)
        if (!isSeatAvailableExcludingSelf(busBookingRequestDto.getBusTripId(), busBookingRequestDto.getSeatId(), id)) {
            throw new SeatAlreadyBookedException(bundleMessageService.getMessage("error.seat_already_booked"));
        }

        // Update fields
        existingBusBooking.setBookingDate(busBookingRequestDto.getBookingDate());
        existingBusBooking.setStatus(busBookingRequestDto.getStatus());
        // Note: price would typically be set based on the trip price

        // Save booking
        BusBooking updatedBusBooking = busBookingRepository.save(existingBusBooking);

        // Return DTO
        return busBookingMapper.busBookingToBusBookingDto(updatedBusBooking);
    }

    @Override
    public void deleteBusBooking(Long id) {
        if (!busBookingRepository.existsById(id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_booking_not_found"));
        }
        busBookingRepository.deleteById(id);
    }

    @Override
    public boolean isSeatAvailable(Long busTripId, Long seatId) {
        // Check if there are any confirmed/pending bookings for this seat on this trip
        return busBookingRepository.findByBusTripIdAndSeatIdAndStatusIn(
                        busTripId, seatId,
                        java.util.List.of("CONFIRMED", "PENDING"))
                .isEmpty();
    }

    /**
     * Check seat availability excluding a specific booking (for updates).
     */
    private boolean isSeatAvailableExcludingSelf(Long busTripId, Long seatId, Long bookingId) {
        // Check if there are any confirmed/pending bookings for this seat on this trip, excluding current booking
        return busBookingRepository.findByBusTripIdAndSeatIdAndStatusInAndIdNot(
                        busTripId, seatId,
                        java.util.List.of("CONFIRMED", "PENDING"), bookingId)
                .isEmpty();
    }
}