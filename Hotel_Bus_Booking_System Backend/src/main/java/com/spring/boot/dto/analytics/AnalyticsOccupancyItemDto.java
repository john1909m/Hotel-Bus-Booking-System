package com.spring.boot.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Item representing hotel occupancy rate and room-night statistics.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsOccupancyItemDto {
    private Long hotelId;
    private String hotelName;
    private Long roomNightsSold;
    private Long roomNightsAvailable;
    private Double occupancyRate;
}
