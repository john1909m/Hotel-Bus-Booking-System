package com.spring.boot.controller;

import com.spring.boot.dto.analytics.*;
import com.spring.boot.enums.BookingStatus;
import com.spring.boot.service.interfaces.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * Controller for Admin-Only Analytics dashboard.
 * Requires ADMIN role on all endpoints. Customers receive 403 Forbidden.
 * Read-only, zero-cache, fresh database aggregations.
 */
@RestController
@RequestMapping("/api/admin/analytics")
@AllArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Analytics", description = "Admin-only analytics and reporting endpoints")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @Operation(summary = "Get high-level summary KPIs",
            description = "Admin only. Returns overall counts of hotels, rooms, buses, customers, as well as booking counts and earned revenue in the date range. If from/to are omitted, defaults to the last 30 days ending today (Africa/Cairo).")
    @GetMapping("/summary")
    public ResponseEntity<AnalyticsSummaryDto> getSummary(
            @Parameter(description = "Start date inclusive (YYYY-MM-DD). If omitted, defaults to 30 days ago.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "End date inclusive (YYYY-MM-DD). If omitted, defaults to today.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(analyticsService.getSummary(from, to));
    }

    @Operation(summary = "Get revenue trends over time",
            description = "Admin only. Returns earned revenue (CONFIRMED and COMPLETED bookings) grouped by DAY, WEEK, or MONTH. Periods with no revenue are zero-filled with no gaps. If from/to are omitted, defaults to the last 30 days ending today (Africa/Cairo).")
    @GetMapping("/revenue")
    public ResponseEntity<AnalyticsRevenueResponseDto> getRevenueTrends(
            @Parameter(description = "Start date inclusive (YYYY-MM-DD). Defaults to 30 days ago if omitted.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "End date inclusive (YYYY-MM-DD). Defaults to today if omitted.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "Grouping granularity: DAY, WEEK, or MONTH", required = true)
            @RequestParam String granularity) {
        return ResponseEntity.ok(analyticsService.getRevenueTrends(from, to, granularity));
    }

    @Operation(summary = "Get booking volume trends over time",
            description = "Admin only. Returns count of bookings grouped by DAY, WEEK, or MONTH, optionally filtered by type (HOTEL or BUS, both if absent) and status. Missing periods are zero-filled. If from/to are omitted, defaults to the last 30 days ending today (Africa/Cairo).")
    @GetMapping("/bookings")
    public ResponseEntity<AnalyticsBookingsResponseDto> getBookingsTrends(
            @Parameter(description = "Start date inclusive (YYYY-MM-DD). Defaults to 30 days ago if omitted.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "End date inclusive (YYYY-MM-DD). Defaults to today if omitted.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "Grouping granularity: DAY, WEEK, or MONTH", required = true)
            @RequestParam String granularity,
            @Parameter(description = "Filter by booking type: HOTEL or BUS (optional, both if omitted)")
            @RequestParam(required = false) String type,
            @Parameter(description = "Filter by booking status (optional, all statuses if omitted)")
            @RequestParam(required = false) BookingStatus status) {
        return ResponseEntity.ok(analyticsService.getBookingsTrends(from, to, granularity, type, status));
    }

    @Operation(summary = "Get booking status distribution",
            description = "Admin only. Returns booking counts grouped by lifecycle status (PENDING, CONFIRMED, CANCELLED, COMPLETED). All lifecycle enum values are guaranteed present with 0 count if none exist. If from/to are omitted, defaults to the last 30 days ending today (Africa/Cairo).")
    @GetMapping("/bookings/status")
    public ResponseEntity<AnalyticsBookingStatusResponseDto> getBookingsByStatus(
            @Parameter(description = "Start date inclusive (YYYY-MM-DD). Defaults to 30 days ago if omitted.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "End date inclusive (YYYY-MM-DD). Defaults to today if omitted.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "Filter by booking type: HOTEL or BUS (optional, both if omitted)")
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(analyticsService.getBookingsByStatus(from, to, type));
    }

    @Operation(summary = "Get top performing hotels",
            description = "Admin only. Returns hotels ranked by REVENUE or BOOKINGS in the requested date range, ordered and limited in the database (limit between 1 and 50, default 10). If from/to are omitted, defaults to the last 30 days ending today (Africa/Cairo).")
    @GetMapping("/hotels/top")
    public ResponseEntity<AnalyticsTopHotelsResponseDto> getTopHotels(
            @Parameter(description = "Start date inclusive (YYYY-MM-DD). Defaults to 30 days ago if omitted.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "End date inclusive (YYYY-MM-DD). Defaults to today if omitted.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "Maximum number of hotels to return (1..50, default 10)")
            @RequestParam(required = false, defaultValue = "10") Integer limit,
            @Parameter(description = "Sort criteria: REVENUE or BOOKINGS (default REVENUE)")
            @RequestParam(required = false, defaultValue = "REVENUE") String sortBy) {
        return ResponseEntity.ok(analyticsService.getTopHotels(from, to, limit, sortBy));
    }

    @Operation(summary = "Get hotel room occupancy rates",
            description = "Admin only. Calculates occupancy = roomNightsSold / roomNightsAvailable. roomNightsSold = nights of active (non-cancelled) bookings clipped to [from, to + 1 day). Available room-nights = hotel total rooms x days in period. Multi-room bookings count nights once per room. If available is 0, occupancyRate is 0.00. If from/to are omitted, defaults to the last 30 days ending today (Africa/Cairo).")
    @GetMapping("/occupancy")
    public ResponseEntity<AnalyticsOccupancyResponseDto> getOccupancy(
            @Parameter(description = "Start date inclusive (YYYY-MM-DD). Defaults to 30 days ago if omitted.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "End date inclusive (YYYY-MM-DD). Defaults to today if omitted.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "Optional hotel ID filter. If omitted, computes occupancy for all hotels.")
            @RequestParam(required = false) Long hotelId) {
        return ResponseEntity.ok(analyticsService.getOccupancy(from, to, hotelId));
    }

    @Operation(summary = "Get bus trips and seat load factors",
            description = "Admin only. Returns bus trips departing in the requested period with booked seats, total seats, and loadFactor = bookedSeats / totalSeats (rounded to 2 decimal places). Ordered by departure time desc, limited in DB (1..50, default 20). If from/to are omitted, defaults to the last 30 days ending today (Africa/Cairo).")
    @GetMapping("/bus-trips")
    public ResponseEntity<AnalyticsBusTripsResponseDto> getBusTrips(
            @Parameter(description = "Start date inclusive (YYYY-MM-DD). Defaults to 30 days ago if omitted.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "End date inclusive (YYYY-MM-DD). Defaults to today if omitted.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "Optional route ID filter.")
            @RequestParam(required = false) Long routeId,
            @Parameter(description = "Maximum number of trips to return (1..50, default 20)")
            @RequestParam(required = false, defaultValue = "20") Integer limit) {
        return ResponseEntity.ok(analyticsService.getBusTrips(from, to, routeId, limit));
    }

    @Operation(summary = "Get payment breakdown by method and status",
            description = "Admin only. Aggregates payment transaction count and total amount grouped by payment method and status in the requested date range. If from/to are omitted, defaults to the last 30 days ending today (Africa/Cairo).")
    @GetMapping("/payments")
    public ResponseEntity<AnalyticsPaymentsResponseDto> getPayments(
            @Parameter(description = "Start date inclusive (YYYY-MM-DD). Defaults to 30 days ago if omitted.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "End date inclusive (YYYY-MM-DD). Defaults to today if omitted.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(analyticsService.getPayments(from, to));
    }
}
