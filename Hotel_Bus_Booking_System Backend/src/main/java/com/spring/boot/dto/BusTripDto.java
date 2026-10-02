package com.spring.boot.dto;

import com.spring.boot.enums.BusTripStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Data Transfer Object for BusTrip entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BusTripDto {

    private Long id;
    private LocalDateTime departureTime;
    private LocalDateTime arrivalTime;
    private BigDecimal price;
    private BusTripStatus status;
    private Long busId; // Reference to bus
    private Long routeId; // Reference to route
}