package com.spring.boot.dto;


import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request Data Transfer Object for BusStop entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BusStopRequestDto {


    private String name;

    private String city;

    private String address;

    private Double latitude;

    private Double longitude;
}