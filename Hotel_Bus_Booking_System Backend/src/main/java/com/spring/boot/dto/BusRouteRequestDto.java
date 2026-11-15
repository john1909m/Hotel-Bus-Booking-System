package com.spring.boot.dto;


import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request Data Transfer Object for BusRoute entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BusRouteRequestDto {

    private String name;

    @NotNull
    private Integer duration;

    @NotNull
    private Long originStopId;

    @NotNull
    private Long destinationStopId;
}