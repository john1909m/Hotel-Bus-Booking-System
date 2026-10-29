package com.spring.boot.dto.analytics;

import com.spring.boot.enums.BookingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Item representing the booking count for a specific status.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsBookingStatusItemDto {
    private BookingStatus status;
    private Long count;
}
