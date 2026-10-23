package com.spring.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Data Transfer Object for Hotel entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HotelDto {

    private Long id;
    private String name;
    private String description;
    private String address;
    private String city;
    private Double latitude;
    private Double longitude;
    private Double rating;
    private String checkInTime;
    private String checkOutTime;

    @io.swagger.v3.oas.annotations.media.Schema(description = "URL of the first hotel-level image (roomType null), or null if the hotel has no gallery image.", nullable = true)
    private String coverImageUrl;
}