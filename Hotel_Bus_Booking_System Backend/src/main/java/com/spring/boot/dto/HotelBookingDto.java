package com.spring.boot.dto;

import com.spring.boot.enums.BookingStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Data Transfer Object for HotelBooking entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HotelBookingDto {

    private Long id;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private Integer guests;
    private BookingStatus status;
    private BigDecimal totalPrice;
    private Long userId; // Reference to user (costumer)
    private Long roomId; // Reference to room (kept for backward compatibility)
    private Long hotelId; // Reference to hotel
    private String hotelName; // Name of the hotel
    private List<RoomSummaryDto> rooms; // List of booked rooms
}