package com.spring.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request Data Transfer Object for Hotel entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HotelRequestDto {


    private String name;

    private String description;

    private String address;


    private String city;

    private Double latitude;

    private Double longitude;

    private Double rating;

    private String checkInTime;

    private String checkOutTime;
}