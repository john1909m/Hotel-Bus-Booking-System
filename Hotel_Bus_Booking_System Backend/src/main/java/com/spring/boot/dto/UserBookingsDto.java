package com.spring.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * DTO encapsulating the authenticated user's hotel and bus bookings.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserBookingsDto {
    private List<HotelBookingDto> hotelBookings;
    private List<BusBookingDto> busBookings;
}
