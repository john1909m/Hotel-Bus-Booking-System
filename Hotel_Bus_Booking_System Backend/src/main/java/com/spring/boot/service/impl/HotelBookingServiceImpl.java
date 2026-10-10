package com.spring.boot.service.impl;

import com.spring.boot.dto.HotelBookingDto;
import com.spring.boot.dto.HotelBookingRequestDto;
import com.spring.boot.exception.InvalidBookingDatesException;
import com.spring.boot.exception.InvalidGuestCountException;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.HotelBooking;
import com.spring.boot.model.Room;
import com.spring.boot.model.Costumer;
import com.spring.boot.mapper.HotelBookingMapper;
import com.spring.boot.repository.HotelBookingRepository;
import com.spring.boot.repository.HotelRepository;
import com.spring.boot.repository.CostumerRepository;
import com.spring.boot.repository.RoomRepository;

import com.spring.boot.service.interfaces.HotelBookingService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.stream.Collectors;

/**
 * Service implementation for HotelBooking entity.
 */
@Service
@AllArgsConstructor
public class HotelBookingServiceImpl implements HotelBookingService {

    private final HotelBookingRepository hotelBookingRepository;
    private final HotelBookingMapper hotelBookingMapper;
    private final RoomRepository roomRepository;
    private final HotelRepository hotelRepository;
    private final CostumerRepository costumerRepository;
    private final BundleMessageService bundleMessageService;

    @Override
    public HotelBookingDto createHotelBooking(HotelBookingRequestDto hotelBookingRequestDto) {
        // Validate dates
        if (hotelBookingRequestDto.getCheckOut().isBefore(hotelBookingRequestDto.getCheckIn()) ||
                hotelBookingRequestDto.getCheckOut().isEqual(hotelBookingRequestDto.getCheckIn())) {
            throw new InvalidBookingDatesException(bundleMessageService.getMessage("error.check_out_before_check_in"));
        }

        // Validate room exists and get it
        var room = roomRepository.findById(hotelBookingRequestDto.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_found")));

        // Validate user exists
        var user = costumerRepository.findById(hotelBookingRequestDto.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.user_not_found")));

        // Validate guest count doesn't exceed room capacity
        if (hotelBookingRequestDto.getGuests() > room.getCapacity()) {
            throw new InvalidGuestCountException(bundleMessageService.getMessage("error.guest_count_exceeds_capacity"));
        }

        // Check room availability
        if (!isRoomAvailable(hotelBookingRequestDto.getRoomId(),
                hotelBookingRequestDto.getCheckIn(),
                hotelBookingRequestDto.getCheckOut(),
                hotelBookingRequestDto.getRoomId())) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_available"));
        }

        // Calculate total price
        long nights = java.time.temporal.ChronoUnit.DAYS.between(
                hotelBookingRequestDto.getCheckIn(),
                hotelBookingRequestDto.getCheckOut());
        BigDecimal totalPrice = (BigDecimal.valueOf(room.getPricePerNight()))
                .multiply(BigDecimal.valueOf(nights));

        // Map DTO to entity
        HotelBooking hotelBooking = hotelBookingMapper.hotelBookingRequestDtoToHotelBooking(hotelBookingRequestDto);
        hotelBooking.setCostumer(user);  // Set the costumer relationship
        hotelBooking.setRoom(room);      // Set the room relationship
        hotelBooking.setTotalPrice(totalPrice);

        // Save booking
        HotelBooking savedHotelBooking = hotelBookingRepository.save(hotelBooking);

        // Return DTO
        return hotelBookingMapper.hotelBookingToHotelBookingDto(savedHotelBooking);
    }

    @Override
    public HotelBookingDto getHotelBookingById(Long id) {
        HotelBooking hotelBooking = hotelBookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_booking_not_found")));
        return hotelBookingMapper.hotelBookingToHotelBookingDto(hotelBooking);
    }

    @Override
    public java.util.List<HotelBookingDto> getAllHotelBookings() {
        return hotelBookingRepository.findAll().stream()
                .map(hotelBookingMapper::hotelBookingToHotelBookingDto)
                .collect(Collectors.toList());
    }

    @Override
    public java.util.List<HotelBookingDto> getHotelBookingsByUserId(Long userId) {
        return hotelBookingRepository.findByCostumer_Id(userId).stream()
                .map(hotelBookingMapper::hotelBookingToHotelBookingDto)
                .collect(Collectors.toList());
    }

    @Override
    public java.util.List<HotelBookingDto> getHotelBookingsByHotelId(Long hotelId) {
        return hotelBookingRepository.findByHotelId(hotelId).stream()
                .map(hotelBookingMapper::hotelBookingToHotelBookingDto)
                .collect(Collectors.toList());
    }

    @Override
    public HotelBookingDto updateHotelBooking(Long id, HotelBookingRequestDto hotelBookingRequestDto) {
        HotelBooking existingHotelBooking = hotelBookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_booking_not_found")));

        // Validate dates
        if (hotelBookingRequestDto.getCheckOut().isBefore(hotelBookingRequestDto.getCheckIn()) ||
                hotelBookingRequestDto.getCheckOut().isEqual(hotelBookingRequestDto.getCheckIn())) {
            throw new InvalidBookingDatesException(bundleMessageService.getMessage("error.check_out_before_check_in"));
        }

        // Validate room exists and get it (if provided)
        Room room = null;
        if (hotelBookingRequestDto.getRoomId() != null) {
            room = roomRepository.findById(hotelBookingRequestDto.getRoomId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_found")));
        }

        // Validate user exists (if provided)
        Costumer user = null;
        if (hotelBookingRequestDto.getUserId() != null) {
            user = costumerRepository.findById(hotelBookingRequestDto.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.user_not_found")));
        }

        // Validate guest count doesn't exceed room capacity (if room provided)
        if (room != null && hotelBookingRequestDto.getGuests() > room.getCapacity()) {
            throw new InvalidGuestCountException(bundleMessageService.getMessage("error.guest_count_exceeds_capacity"));
        }

        // Check room availability (excluding current booking)
        if (room != null && !isRoomAvailableExcludingSelf(room.getId(),
                hotelBookingRequestDto.getCheckIn(),
                hotelBookingRequestDto.getCheckOut(),
                hotelBookingRequestDto.getRoomId(),
                id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_available"));
        }

        // Calculate total price
        long nights = java.time.temporal.ChronoUnit.DAYS.between(
                hotelBookingRequestDto.getCheckIn(),
                hotelBookingRequestDto.getCheckOut());
        BigDecimal totalPrice = BigDecimal.valueOf(room != null ? room.getPricePerNight() : existingHotelBooking.getRoom().getPricePerNight())
                .multiply(BigDecimal.valueOf(nights));

        // Update fields
        existingHotelBooking.setCheckIn(hotelBookingRequestDto.getCheckIn());
        existingHotelBooking.setCheckOut(hotelBookingRequestDto.getCheckOut());
        existingHotelBooking.setGuests(hotelBookingRequestDto.getGuests());
        existingHotelBooking.setTotalPrice(totalPrice);

        // Handle costumer relationship: if provided, validate and set; if not provided, keep existing
        if (user != null) {
            existingHotelBooking.setCostumer(user);
        }

        // Handle room relationship: if provided, validate and set; if not provided, keep existing
        if (room != null) {
            existingHotelBooking.setRoom(room);
        }

        // Save booking
        HotelBooking updatedHotelBooking = hotelBookingRepository.save(existingHotelBooking);

        // Return DTO
        return hotelBookingMapper.hotelBookingToHotelBookingDto(updatedHotelBooking);
    }

    @Override
    public void deleteHotelBooking(Long id) {
        if (!hotelBookingRepository.existsById(id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_booking_not_found"));
        }
        hotelBookingRepository.deleteById(id);
    }

    @Override
    public boolean isRoomAvailable(Long hotelId, LocalDate checkIn, LocalDate checkOut, Long roomId) {
        // This is a simplified version - in reality, we'd check against existing bookings
        // For now, we'll just check if the room exists and belongs to the hotel
        var room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_found")));

        if (!room.getHotel().getId().equals(hotelId)) {
            return false;
        }

        // Check for overlapping bookings (simplified)
        return hotelBookingRepository.findOverlappingBookings(
                        roomId, checkIn, checkOut)
                .isEmpty();
    }

    /**
     * Check room availability excluding a specific booking (for updates).
     */
    private boolean isRoomAvailableExcludingSelf(Long roomId, LocalDate checkIn, LocalDate checkOut, Long hotelId, Long bookingId) {
        // Simplified version - just check if room exists and belongs to hotel
        var room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_found")));

        if (!room.getHotel().getId().equals(hotelId)) {
            return false;
        }

        // Check for overlapping bookings excluding current booking
        return hotelBookingRepository.findOverlappingBookingsExcludingSelf(
                        roomId, checkIn, checkOut, bookingId)
                .isEmpty();
    }
}