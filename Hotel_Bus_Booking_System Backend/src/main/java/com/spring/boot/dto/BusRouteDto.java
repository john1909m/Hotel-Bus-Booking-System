package com.spring.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Data Transfer Object for BusRoute entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BusRouteDto {

    private Long id;
    private String name;
    private Integer duration; // in minutes
    private Long originStopId; // Reference to origin bus stop
    private Long destinationStopId; // Reference to destination bus stop
}