package com.spring.boot.dto;


import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

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


    private Long userId;


    private Long roomId;
}