package com.spring.boot.config;

import com.spring.boot.dto.UserDto;
import com.spring.boot.model.HotelBooking;
import com.spring.boot.repository.HotelBookingRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.Objects;

@Component("hotelBookingSecurity")
public class HotelBookingSecurity {

    private final HotelBookingRepository hotelBookingRepository;

    public HotelBookingSecurity(HotelBookingRepository hotelBookingRepository) {
        this.hotelBookingRepository = hotelBookingRepository;
    }

    /**
     * Returns true if the authentication principal owns the booking with given id.
     * If the booking does not exist, returns true so that the service layer can throw 404.
     */
    public boolean isOwner(Long bookingId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof UserDto)) {
            return false;
        }
        UserDto userDto = (UserDto) principal;
        Long userId = userDto.getId();

        HotelBooking booking = hotelBookingRepository.findById(bookingId).orElse(null);
        if (booking == null) {
            // Booking not found; let service handle 404
            return true;
        }
        return Objects.equals(booking.getUser().getId(), userId);
    }
}