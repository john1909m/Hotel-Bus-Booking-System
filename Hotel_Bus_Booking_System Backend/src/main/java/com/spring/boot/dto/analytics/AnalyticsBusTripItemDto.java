package com.spring.boot.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Item representing bus trip load factor and seat utilization.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsBusTripItemDto {
    private Long tripId;
    private String routeName;
    private LocalDateTime departureTime;
    private Long bookedSeats;
    private Integer totalSeats;
    private Double loadFactor;
}
