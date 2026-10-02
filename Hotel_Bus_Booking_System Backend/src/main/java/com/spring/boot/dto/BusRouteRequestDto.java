package com.spring.boot.dto;


import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.antlr.v4.runtime.misc.NotNull;

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