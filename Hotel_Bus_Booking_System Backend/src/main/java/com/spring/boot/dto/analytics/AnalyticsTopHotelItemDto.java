package com.spring.boot.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Item representing top performing hotel metrics.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsTopHotelItemDto {
    private Long hotelId;
    private String hotelName;
    private String city;
    private Long bookings;
    private BigDecimal revenue;
}
