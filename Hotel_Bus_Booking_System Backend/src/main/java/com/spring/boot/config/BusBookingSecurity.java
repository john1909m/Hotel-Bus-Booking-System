package com.spring.boot.config;

import com.spring.boot.dto.UserDto;
import com.spring.boot.model.BusBooking;
import com.spring.boot.repository.BusBookingRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.Objects;

@Component("busBookingSecurity")
public class BusBookingSecurity {

    private final BusBookingRepository busBookingRepository;

    public BusBookingSecurity(BusBookingRepository busBookingRepository) {
        this.busBookingRepository = busBookingRepository;
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

        BusBooking booking = busBookingRepository.findById(bookingId).orElse(null);
        if (booking == null) {
            // Booking not found; let service handle 404
            return true;
        }
        return Objects.equals(booking.getUser().getId(), userId);
    }
}