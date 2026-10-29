package com.spring.boot.helper;

import com.spring.boot.enums.BookingStatus;

import java.time.ZoneId;
import java.util.Collections;
import java.util.Set;

/**
 * Shared constants for Analytics, ensuring REVENUE and ACTIVE status sets
 * are defined in ONE single location without repetition.
 */
public final class AnalyticsConstants {

    private AnalyticsConstants() {}

    public static final ZoneId CAIRO_ZONE = ZoneId.of("Africa/Cairo");

    /**
     * The single constant set for bookings considered as earned revenue.
     */
    public static final Set<BookingStatus> REVENUE_STATUSES = Collections.unmodifiableSet(
            Set.of(BookingStatus.CONFIRMED, BookingStatus.COMPLETED)
    );

    /**
     * The single constant set for active (non-cancelled) bookings.
     */
    public static final Set<BookingStatus> ACTIVE_STATUSES = Collections.unmodifiableSet(
            Set.of(BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.PENDING)
    );
}
