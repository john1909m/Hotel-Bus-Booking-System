package com.spring.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Data Transfer Object for HotelBusStop entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HotelBusStopDto {

    private Long id;
    private Double distance; // in kilometers
    private Long hotelId; // Reference to hotel
    private Long busStopId; // Reference to bus stop
}