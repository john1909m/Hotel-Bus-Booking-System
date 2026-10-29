package com.spring.boot.service.interfaces;

import com.spring.boot.dto.analytics.*;
import com.spring.boot.enums.BookingStatus;

import java.time.LocalDate;

/**
 * Service interface for admin analytics operations.
 * Read-only analytics aggregating booking, revenue, occupancy, and bus trip metrics.
 * Not cached (@Cacheable forbidden) to guarantee real-time admin figures.
 */
public interface AnalyticsService {

    AnalyticsSummaryDto getSummary(LocalDate from, LocalDate to);

    AnalyticsRevenueResponseDto getRevenueTrends(LocalDate from, LocalDate to, String granularity);

    AnalyticsBookingsResponseDto getBookingsTrends(LocalDate from, LocalDate to, String granularity, String type, BookingStatus status);

    AnalyticsBookingStatusResponseDto getBookingsByStatus(LocalDate from, LocalDate to, String type);

    AnalyticsTopHotelsResponseDto getTopHotels(LocalDate from, LocalDate to, Integer limit, String sortBy);

    AnalyticsOccupancyResponseDto getOccupancy(LocalDate from, LocalDate to, Long hotelId);

    AnalyticsBusTripsResponseDto getBusTrips(LocalDate from, LocalDate to, Long routeId, Integer limit);

    AnalyticsPaymentsResponseDto getPayments(LocalDate from, LocalDate to);
}
