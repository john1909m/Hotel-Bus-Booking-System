package com.spring.boot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Request Data Transfer Object for HotelBooking entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HotelBookingRequestDto {

    @Schema(description = "Check-in date (yyyy-MM-dd)", example = "2026-11-01")
    private LocalDate checkIn;

    @Schema(description = "Check-out date (yyyy-MM-dd)", example = "2026-11-05")
    private LocalDate checkOut;

    @Schema(description = "Legacy guest count (backward compatibility fallback)", example = "2", deprecated = true)
    private Integer guests;

    @Schema(description = "Number of adult guests (required, >= 1)", example = "2")
    private Integer adults;

    @Schema(description = "List of child ages (0-17). Children under 12 do not count towards room capacity.", example = "[5, 8]")
    private List<Integer> childAges;

    @Schema(description = "Room ID for single-room booking (fallback for roomIds)", example = "1")
    private Long roomId;

    @Schema(description = "List of room IDs for multi-room booking", example = "[1, 2]")
    private List<Long> roomIds;

    public HotelBookingRequestDto(LocalDate checkIn, LocalDate checkOut, Integer guests, Long roomId) {
        this.checkIn = checkIn;
        this.checkOut = checkOut;
        this.guests = guests;
        this.adults = guests;
        this.childAges = new ArrayList<>();
        this.roomId = roomId;
        this.roomIds = roomId != null ? List.of(roomId) : null;
    }

    public HotelBookingRequestDto(LocalDate checkIn, LocalDate checkOut, Integer adults, List<Integer> childAges, Long roomId) {
        this.checkIn = checkIn;
        this.checkOut = checkOut;
        this.adults = adults;
        this.childAges = childAges != null ? childAges : new ArrayList<>();
        this.guests = adults;
        this.roomId = roomId;
        this.roomIds = roomId != null ? List.of(roomId) : null;
    }
}