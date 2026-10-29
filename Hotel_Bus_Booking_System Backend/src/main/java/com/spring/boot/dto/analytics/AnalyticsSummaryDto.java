package com.spring.boot.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Summary analytics DTO for key booking and revenue indicators.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsSummaryDto {
    private Long totalHotels;
    private Long totalRooms;
    private Long totalBuses;
    private Long totalCustomers;
    private Long hotelBookings;
    private Long busBookings;
    private Long activeBookings;
    private Long cancelledBookings;
    private BigDecimal revenue;
    private BigDecimal hotelRevenue;
    private BigDecimal busRevenue;
}
