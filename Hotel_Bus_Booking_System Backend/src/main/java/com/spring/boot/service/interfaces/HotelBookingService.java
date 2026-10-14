package com.spring.boot.service.interfaces;

import com.spring.boot.dto.HotelBookingDto;
import com.spring.boot.dto.HotelBookingRequestDto;
import org.springframework.data.domain.Pageable;
import com.spring.boot.enums.BookingStatus;
import org.springframework.data.domain.Page;

import java.time.LocalDate;
import java.util.List;


/**
 * Service interface for HotelBooking entity.
 */
public interface HotelBookingService {

    HotelBookingDto createHotelBooking(HotelBookingRequestDto hotelBookingRequestDto, Long userId);

    HotelBookingDto getHotelBookingById(Long id);

    List<HotelBookingDto> getAllHotelBookings();

    List<HotelBookingDto> getHotelBookingsByUserId(Long userId);

    List<HotelBookingDto> getHotelBookingsByHotelId(Long hotelId);

    /**
     * Get hotel bookings for the current authenticated user.
     *
     * @param userId the ID of the current user
     * @return list of hotel bookings for the user
     */
    List<HotelBookingDto> getMyHotelBookings(Long userId);

    Page<HotelBookingDto> getAllHotelBookingsPaginated(Pageable pageable,
                                                       BookingStatus status,
                                                       LocalDate checkInAfter, LocalDate checkInBefore,
                                                       Long userId, Long hotelId);

    HotelBookingDto updateHotelBooking(Long id, HotelBookingRequestDto hotelBookingRequestDto);

    void deleteHotelBooking(Long id);

    /**
     * Check room availability for a hotel and date range.
     *
     * @param hotelId    the hotel ID
     * @param checkIn    the check-in date
     * @param checkOut   the check-out date
     * @param roomId     the room ID (optional)
     * @return true if room(s) are available, false otherwise
     */
    boolean isRoomAvailable(Long hotelId, LocalDate checkIn, LocalDate checkOut, Long roomId);
}