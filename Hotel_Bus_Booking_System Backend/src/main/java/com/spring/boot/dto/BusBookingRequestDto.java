package com.spring.boot.dto;


import com.spring.boot.enums.BookingStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.antlr.v4.runtime.misc.NotNull;

import java.time.LocalDate;



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

    @NotNull
    private LocalDate bookingDate;

    @NotNull
    private BookingStatus status;

    private BigDecimal price;

    @NotNull
    private Long userId; // Reference to user (costumer)

    @NotNull
    private Long busTripId;

    @NotNull
    private Long seatId;
}