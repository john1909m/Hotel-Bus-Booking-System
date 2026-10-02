package com.spring.boot.dto;

//import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request Data Transfer Object for HotelBusStop entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HotelBusStopRequestDto {


    private Double distance;


    private Long hotelId;


    private Long busStopId;
}