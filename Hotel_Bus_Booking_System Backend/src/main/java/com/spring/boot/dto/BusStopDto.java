package com.spring.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Data Transfer Object for BusStop entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BusStopDto {

    private Long id;
    private String name;
    private String city;
    private String address;
    private Double latitude;
    private Double longitude;
}