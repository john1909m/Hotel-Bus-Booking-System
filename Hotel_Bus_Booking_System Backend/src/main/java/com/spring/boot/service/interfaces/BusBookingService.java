package com.spring.boot.service.interfaces;

import com.spring.boot.dto.BusBookingDto;
import com.spring.boot.dto.BusBookingRequestDto;
import com.spring.boot.enums.BookingStatus;
import org.springframework.data.repository.query.Param;

import java.util.List;





/**
 * Service interface for BusBooking entity.
 */
public interface BusBookingService {

    BusBookingDto createBusBooking(BusBookingRequestDto busBookingRequestDto);

    BusBookingDto getBusBookingById(Long id);

    List<BusBookingDto> getAllBusBookings();

    List<BusBookingDto> getBusBookingsByUserId(Long userId);

    List<BusBookingDto> getBusBookingsByBusTripId(Long busTripId);

    List<Long> getBookedSeatIdsByTripId(Long tripId);
    /**
     * Get bus bookings for the current authenticated user.
     *
     * @param userId the ID of the current user
     * @return list of bus bookings for the user
     */
    List<BusBookingDto> getMyBusBookings(Long userId);

    BusBookingDto updateBusBooking(Long id, BusBookingRequestDto busBookingRequestDto);

    void deleteBusBooking(Long id);

    /**
     * Check seat availability for a specific bus trip.
     *
     * @param busTripId the bus trip ID
     * @param seatId    the seat ID
     * @return true if seat is available, false otherwise
     */
    boolean isSeatAvailable(Long busTripId, Long seatId);
}