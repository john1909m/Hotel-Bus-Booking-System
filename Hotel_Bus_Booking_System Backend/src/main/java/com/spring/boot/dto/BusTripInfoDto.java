package com.spring.boot.dto;

import com.spring.boot.enums.BusTripStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Detailed DTO for bus trips returned by AI tools.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BusTripInfoDto {
    private Long id;
    private Long routeId;
    private String routeName;
    private String originCity;
    private String originStopName;
    private String destinationCity;
    private String destinationStopName;
    private LocalDateTime departureTime;
    private LocalDateTime arrivalTime;
    private BigDecimal price;
    private BusTripStatus status;
}
