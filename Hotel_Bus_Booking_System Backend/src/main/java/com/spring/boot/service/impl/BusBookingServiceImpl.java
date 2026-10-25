package com.spring.boot.service.impl;

import com.spring.boot.dto.BusBookingDto;
import com.spring.boot.dto.BusBookingRequestDto;
import com.spring.boot.enums.BookingStatus;
import com.spring.boot.exception.BookingConflictException;
import com.spring.boot.exception.InvalidSeatException;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.exception.SeatAlreadyBookedException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.helper.SecurityUtils;
import com.spring.boot.mapper.BusBookingMapper;
import com.spring.boot.model.BusBooking;
import com.spring.boot.model.BusSeat;
import com.spring.boot.model.BusTrip;
import com.spring.boot.model.User;
import com.spring.boot.repository.BusBookingRepository;
import com.spring.boot.repository.BusRepository;
import com.spring.boot.repository.BusSeatRepository;
import com.spring.boot.repository.BusTripRepository;
import com.spring.boot.repository.UserRepository;
import com.spring.boot.service.interfaces.BusBookingService;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service implementation for BusBooking entity.
 */
@Service
@AllArgsConstructor
public class BusBookingServiceImpl implements BusBookingService {

    private static final Map<BookingStatus, Set<BookingStatus>> ALLOWED_BOOKING_TRANSITIONS = Map.of(
            BookingStatus.PENDING, Set.of(BookingStatus.CONFIRMED, BookingStatus.CANCELLED),
            BookingStatus.CONFIRMED, Set.of(BookingStatus.COMPLETED, BookingStatus.CANCELLED),
            BookingStatus.COMPLETED, Collections.emptySet(),
            BookingStatus.CANCELLED, Collections.emptySet()
    );

    private final BusBookingRepository busBookingRepository;
    private final BusBookingMapper busBookingMapper;
    private final BusTripRepository busTripRepository;
    private final BusSeatRepository busSeatRepository;
    private final BusRepository busRepository;
    private final UserRepository userRepository;
    private final BundleMessageService bundleMessageService;

    public void validateStatusTransition(BookingStatus current, BookingStatus requested) {
        if (requested == null || current == requested) {
            return;
        }
        Set<BookingStatus> allowed = ALLOWED_BOOKING_TRANSITIONS.getOrDefault(current, Collections.emptySet());
        if (!allowed.contains(requested)) {
            throw new BookingConflictException(
                    bundleMessageService.getMessage("error.booking.invalid_status_transition", new Object[]{current, requested})
            );
        }
    }

    @Override
    @Transactional
    public BusBookingDto createBusBooking(BusBookingRequestDto busBookingRequestDto) {
        // Validate that user exists
        User user = userRepository.findById(busBookingRequestDto.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.user_not_found")));

        // Pessimistic lock on the BusTrip row to serialize concurrent seat bookings on this trip
        BusTrip busTrip = busTripRepository.findByIdForUpdate(busBookingRequestDto.getBusTripId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_trip_not_found")));

        // Validate that seat exists
        BusSeat seat = busSeatRepository.findById(busBookingRequestDto.getSeatId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_seat_not_found")));

        // Validate that seat belongs to the bus assigned to the trip
        if (!seat.getBus().getId().equals(busTrip.getBus().getId())) {
            throw new InvalidSeatException(bundleMessageService.getMessage("error.seat_does_not_belong_to_bus"));
        }

        // Check seat availability under the pessimistic lock
        if (!isSeatAvailable(busBookingRequestDto.getBusTripId(), busBookingRequestDto.getSeatId())) {
            throw new SeatAlreadyBookedException(bundleMessageService.getMessage("error.seat_already_booked"));
        }

        // Map DTO to entity
        BusBooking busBooking = busBookingMapper.busBookingRequestDtoToBusBooking(busBookingRequestDto);
        busBooking.setUser(user);
        busBooking.setBusTrip(busTrip);
        busBooking.setSeat(seat);
        if (busBooking.getStatus() == null) {
            busBooking.setStatus(BookingStatus.PENDING);
        }

        // Save booking
        BusBooking savedBusBooking = busBookingRepository.save(busBooking);

        // Return DTO
        return busBookingMapper.busBookingToBusBookingDto(savedBusBooking);
    }

    @Override
    @Transactional(readOnly = true)
    public BusBookingDto getBusBookingById(Long id) {
        BusBooking busBooking = busBookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_booking_not_found")));

        if (!SecurityUtils.isOwnerOrAdmin(busBooking.getUser() != null ? busBooking.getUser().getId() : null)) {
            // For reads: return 404 (do not reveal existence)
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_booking_not_found"));
        }

        return busBookingMapper.busBookingToBusBookingDto(busBooking);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BusBookingDto> getAllBusBookings() {
        return busBookingRepository.findAll().stream()
                .map(busBookingMapper::busBookingToBusBookingDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BusBookingDto> getAllBusBookings(Pageable pageable,
                                                 BookingStatus status,
                                                 LocalDate bookingDateAfter,
                                                 LocalDate bookingDateBefore,
                                                 Long userId,
                                                 Long busTripId,
                                                 Long seatId) {
        Page<BusBooking> busBookingPage = busBookingRepository.findByFilters(
                status,
                bookingDateAfter,
                bookingDateBefore,
                userId,
                busTripId,
                seatId,
                pageable
        );

        return busBookingPage.map(busBookingMapper::busBookingToBusBookingDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BusBookingDto> getBusBookingsByBusTripId(Long busTripId,
                                                         Pageable pageable,
                                                         BookingStatus status,
                                                         LocalDate bookingDateAfter,
                                                         LocalDate bookingDateBefore,
                                                         Long userId) {
        Page<BusBooking> busBookingPage = busBookingRepository.findByFilters(
                status,
                bookingDateAfter,
                bookingDateBefore,
                userId,
                busTripId,
                null,
                pageable
        );

        return busBookingPage.map(busBookingMapper::busBookingToBusBookingDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BusBookingDto> getBusBookingsByUserId(Long userId) {
        if (!SecurityUtils.isOwnerOrAdmin(userId)) {
            return Collections.emptyList();
        }
        return busBookingRepository.findByUser_Id(userId).stream()
                .map(busBookingMapper::busBookingToBusBookingDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BusBookingDto> getBusBookingsByBusTripId(Long busTripId) {
        return busBookingRepository.findByBusTripId(busTripId).stream()
                .map(busBookingMapper::busBookingToBusBookingDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public BusBookingDto updateBusBooking(Long id, BusBookingRequestDto busBookingRequestDto) {
        BusBooking existingBusBooking = busBookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_booking_not_found")));

        if (!SecurityUtils.isOwnerOrAdmin(existingBusBooking.getUser() != null ? existingBusBooking.getUser().getId() : null)) {
            throw new AccessDeniedException(bundleMessageService.getMessage("error.access_denied"));
        }

        // Validate status transition if status is being updated
        if (busBookingRequestDto.getStatus() != null && busBookingRequestDto.getStatus() != existingBusBooking.getStatus()) {
            validateStatusTransition(existingBusBooking.getStatus(), busBookingRequestDto.getStatus());
            existingBusBooking.setStatus(busBookingRequestDto.getStatus());
        }

        Long targetTripId = busBookingRequestDto.getBusTripId() != null
                ? busBookingRequestDto.getBusTripId()
                : existingBusBooking.getBusTrip().getId();
        Long targetSeatId = busBookingRequestDto.getSeatId() != null
                ? busBookingRequestDto.getSeatId()
                : existingBusBooking.getSeat().getId();

        boolean tripOrSeatChanged = !targetTripId.equals(existingBusBooking.getBusTrip().getId()) ||
                !targetSeatId.equals(existingBusBooking.getSeat().getId());

        BusTrip busTrip = existingBusBooking.getBusTrip();
        if (tripOrSeatChanged) {
            // Lock target trip row with pessimistic lock
            busTrip = busTripRepository.findByIdForUpdate(targetTripId)
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_trip_not_found")));

            BusSeat seat = busSeatRepository.findById(targetSeatId)
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_seat_not_found")));

            if (!seat.getBus().getId().equals(busTrip.getBus().getId())) {
                throw new InvalidSeatException(bundleMessageService.getMessage("error.seat_does_not_belong_to_bus"));
            }

            if (!isSeatAvailableExcludingSelf(targetTripId, targetSeatId, id)) {
                throw new SeatAlreadyBookedException(bundleMessageService.getMessage("error.seat_already_booked"));
            }

            existingBusBooking.setBusTrip(busTrip);
            existingBusBooking.setSeat(seat);
        }

        existingBusBooking.setBookingDate(busBookingRequestDto.getBookingDate());

        BusBooking updatedBusBooking = busBookingRepository.save(existingBusBooking);
        return busBookingMapper.busBookingToBusBookingDto(updatedBusBooking);
    }

    @Override
    @Transactional
    public BusBookingDto updateBookingStatus(Long id, BookingStatus newStatus) {
        BusBooking booking = busBookingRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_booking_not_found")));

        validateStatusTransition(booking.getStatus(), newStatus);
        booking.setStatus(newStatus);
        BusBooking saved = busBookingRepository.save(booking);
        return busBookingMapper.busBookingToBusBookingDto(saved);
    }

    @Override
    @Transactional
    public void deleteBusBooking(Long id) {
        BusBooking existing = busBookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_booking_not_found")));

        if (!SecurityUtils.isOwnerOrAdmin(existing.getUser() != null ? existing.getUser().getId() : null)) {
            throw new AccessDeniedException(bundleMessageService.getMessage("error.access_denied"));
        }

        busBookingRepository.delete(existing);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isSeatAvailable(Long busTripId, Long seatId) {
        return busBookingRepository
                .findByBusTripIdAndSeatIdAndStatusIn(
                        busTripId, seatId, BusBookingRepository.ACTIVE_STATUSES)
                .isEmpty();
    }

    private boolean isSeatAvailableExcludingSelf(Long busTripId, Long seatId, Long bookingId) {
        return busBookingRepository
                .findByBusTripIdAndSeatIdAndStatusInAndIdNot(
                        busTripId, seatId, BusBookingRepository.ACTIVE_STATUSES, bookingId)
                .isEmpty();
    }

    @Override
    @Transactional(readOnly = true)
    public List<BusBookingDto> getMyBusBookings(Long userId) {
        return getBusBookingsByUserId(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Long> getBookedSeatIdsByTripId(Long tripId) {
        return busBookingRepository.findBookedSeatIdsByTripId(tripId);
    }
}