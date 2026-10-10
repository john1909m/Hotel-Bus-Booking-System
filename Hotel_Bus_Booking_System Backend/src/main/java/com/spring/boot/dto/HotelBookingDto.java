package com.spring.boot.dto;

import com.spring.boot.enums.BookingStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

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
    private Long roomId; // Reference to room
    private Long hotelId; // Reference to hotel
}