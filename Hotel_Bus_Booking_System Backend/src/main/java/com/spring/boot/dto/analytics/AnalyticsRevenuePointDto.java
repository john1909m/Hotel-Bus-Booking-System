package com.spring.boot.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Individual data point for revenue trend charts.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsRevenuePointDto {
    private String periodStart;
    private BigDecimal revenue;
    private BigDecimal hotelRevenue;
    private BigDecimal busRevenue;
}
