package com.spring.boot.dto;


import com.spring.boot.enums.BookingStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Data Transfer Object for BusBooking entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BusBookingDto {

    private Long id;
    private LocalDate bookingDate;
    private BookingStatus status;
    private BigDecimal price;
    private Long userId; // Reference to user (costumer)
    private Long busTripId; // Reference to bus trip
    private Long seatId; // Reference to seat
}