package com.spring.boot.dto;

import com.spring.boot.enums.BookingStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request Data Transfer Object for BusBooking entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BusBookingRequestDto {

    @NotNull(message = "Booking date is required")
    private LocalDate bookingDate;

    @NotNull(message = "Status is required")
    private BookingStatus status;

    private BigDecimal price;

    private Long userId; // Reference to user (costumer)

    @NotNull(message = "Bus trip ID is required")
    private Long busTripId;

    @NotNull(message = "Seat ID is required")
    private Long seatId;
}