package com.spring.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

/**
 * Request Data Transfer Object for HotelBooking entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HotelBookingRequestDto {

    private LocalDate checkIn;

    private LocalDate checkOut;

    private Integer guests;

    private Long roomId;

    private List<Long> roomIds;

    public HotelBookingRequestDto(LocalDate checkIn, LocalDate checkOut, Integer guests, Long roomId) {
        this.checkIn = checkIn;
        this.checkOut = checkOut;
        this.guests = guests;
        this.roomId = roomId;
        this.roomIds = roomId != null ? List.of(roomId) : null;
    }
}