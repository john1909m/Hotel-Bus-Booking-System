package com.spring.boot.dto;

import com.spring.boot.enums.BookingStatus;
import io.swagger.v3.oas.annotations.media.Schema;
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
    @Schema(description = "Total number of guests (adults + children)", example = "3")
    private Integer guests;
    @Schema(description = "Number of adult guests", example = "2")
    private Integer adults;
    @Schema(description = "List of child ages (0-17)", example = "[5]")
    private List<Integer> childAges;
    private BookingStatus status;
    private BigDecimal totalPrice;
    private Long userId; // Reference to user (costumer)
    private Long roomId; // Reference to room (kept for backward compatibility)
    private Long hotelId; // Reference to hotel
    private String hotelName; // Name of the hotel
    private List<RoomSummaryDto> rooms; // List of booked rooms
}