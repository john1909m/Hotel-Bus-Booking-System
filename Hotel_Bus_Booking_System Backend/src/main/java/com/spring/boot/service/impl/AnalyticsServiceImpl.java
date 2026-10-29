package com.spring.boot.service.impl;

import com.spring.boot.dto.analytics.*;
import com.spring.boot.enums.BookingStatus;
import com.spring.boot.exception.AnalyticsValidationException;
import com.spring.boot.helper.AnalyticsConstants;
import com.spring.boot.repository.AnalyticsRepository;
import com.spring.boot.service.interfaces.AnalyticsService;
import lombok.AllArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Implementation of AnalyticsService.
 * All aggregations run strictly in the database.
 * No caching is applied so admin metrics are always freshly computed.
 * Logging of totals is kept at DEBUG level only.
 */
@Service
@AllArgsConstructor
@Transactional(readOnly = true)
public class AnalyticsServiceImpl implements AnalyticsService {

    private static final Logger logger = LoggerFactory.getLogger(AnalyticsServiceImpl.class);

    private final AnalyticsRepository analyticsRepository;

    public record ValidatedDateRange(LocalDate from, LocalDate to) {}

    /**
     * Validates and resolves date ranges according to business requirements:
     * - Defaults to last 30 days ending today in Africa/Cairo when both absent.
     * - Requires both when one is present.
     * - Ensures from <= to.
     * - Enforces maximum range of 366 days.
     */
    public ValidatedDateRange validateAndResolveDateRange(LocalDate from, LocalDate to) {
        if (from == null && to == null) {
            LocalDate today = LocalDate.now(AnalyticsConstants.CAIRO_ZONE);
            return new ValidatedDateRange(today.minusDays(29), today);
        }
        if (from == null) {
            throw new AnalyticsValidationException("from", "error.date_from_required");
        }
        if (to == null) {
            throw new AnalyticsValidationException("to", "error.date_to_required");
        }
        if (from.isAfter(to)) {
            throw new AnalyticsValidationException("from", "error.date_range_invalid");
        }
        if (ChronoUnit.DAYS.between(from, to) + 1 > 366) {
            throw new AnalyticsValidationException("range", "error.date_range_exceeded");
        }
        return new ValidatedDateRange(from, to);
    }

    private String validateGranularity(String granularity) {
        if (granularity == null || granularity.trim().isEmpty()) {
            throw new AnalyticsValidationException("granularity", "error.granularity_invalid");
        }
        String upper = granularity.trim().toUpperCase();
        if (!Set.of("DAY", "WEEK", "MONTH").contains(upper)) {
            throw new AnalyticsValidationException("granularity", "error.granularity_invalid");
        }
        return upper;
    }

    private String validateType(String type, boolean required) {
        if (type == null || type.trim().isEmpty()) {
            if (required) {
                throw new AnalyticsValidationException("type", "error.booking_type_invalid");
            }
            return null;
        }
        String upper = type.trim().toUpperCase();
        if (!Set.of("HOTEL", "BUS").contains(upper)) {
            throw new AnalyticsValidationException("type", "error.booking_type_invalid");
        }
        return upper;
    }

    private String validateSortBy(String sortBy) {
        if (sortBy == null || sortBy.trim().isEmpty()) {
            return "REVENUE";
        }
        String upper = sortBy.trim().toUpperCase();
        if (!Set.of("REVENUE", "BOOKINGS").contains(upper)) {
            throw new AnalyticsValidationException("sortBy", "error.sort_by_invalid");
        }
        return upper;
    }

    private int validateLimit(Integer limit, int defaultLimit) {
        if (limit == null) {
            return defaultLimit;
        }
        if (limit < 1 || limit > 50) {
            throw new AnalyticsValidationException("limit", "error.limit_invalid");
        }
        return limit;
    }

    // -------------------------------------------------------------
    // 1. SUMMARY
    // -------------------------------------------------------------
    @Override
    public AnalyticsSummaryDto getSummary(LocalDate from, LocalDate to) {
        ValidatedDateRange range = validateAndResolveDateRange(from, to);

        long totalHotels = analyticsRepository.countTotalHotels();
        long totalRooms = analyticsRepository.countTotalRooms();
        long totalBuses = analyticsRepository.countTotalBuses();
        long totalCustomers = analyticsRepository.countTotalCustomers();

        Object[] hotelStats = analyticsRepository.getHotelBookingStats(range.from(), range.to());
        Object[] busStats = analyticsRepository.getBusBookingStats(range.from(), range.to());

        long hotelBookings = toLong(hotelStats[0]);
        long activeHotelBookings = toLong(hotelStats[1]);
        long cancelledHotelBookings = toLong(hotelStats[2]);
        BigDecimal hotelRevenue = toBigDecimal(hotelStats[3]);

        long busBookings = toLong(busStats[0]);
        long activeBusBookings = toLong(busStats[1]);
        long cancelledBusBookings = toLong(busStats[2]);
        BigDecimal busRevenue = toBigDecimal(busStats[3]);

        long activeBookings = activeHotelBookings + activeBusBookings;
        long cancelledBookings = cancelledHotelBookings + cancelledBusBookings;
        BigDecimal totalRevenue = hotelRevenue.add(busRevenue);

        logger.debug("Summary analytics [{} to {}]: revenue={}, hotelRevenue={}, busRevenue={}",
                range.from(), range.to(), totalRevenue, hotelRevenue, busRevenue);

        return AnalyticsSummaryDto.builder()
                .totalHotels(totalHotels)
                .totalRooms(totalRooms)
                .totalBuses(totalBuses)
                .totalCustomers(totalCustomers)
                .hotelBookings(hotelBookings)
                .busBookings(busBookings)
                .activeBookings(activeBookings)
                .cancelledBookings(cancelledBookings)
                .revenue(totalRevenue)
                .hotelRevenue(hotelRevenue)
                .busRevenue(busRevenue)
                .build();
    }

    // -------------------------------------------------------------
    // 2. REVENUE TRENDS
    // -------------------------------------------------------------
    @Override
    public AnalyticsRevenueResponseDto getRevenueTrends(LocalDate from, LocalDate to, String granularity) {
        ValidatedDateRange range = validateAndResolveDateRange(from, to);
        String validGranularity = validateGranularity(granularity);

        Map<LocalDate, BigDecimal> hotelRevenue = analyticsRepository.getHotelRevenueByGranularity(
                range.from(), range.to(), validGranularity
        );
        Map<LocalDate, BigDecimal> busRevenue = analyticsRepository.getBusRevenueByGranularity(
                range.from(), range.to(), validGranularity
        );

        List<LocalDate> periods = generatePeriods(range.from(), range.to(), validGranularity);
        List<AnalyticsRevenuePointDto> points = new ArrayList<>(periods.size());

        for (LocalDate period : periods) {
            BigDecimal hRev = hotelRevenue.getOrDefault(period, BigDecimal.ZERO);
            BigDecimal bRev = busRevenue.getOrDefault(period, BigDecimal.ZERO);
            BigDecimal total = hRev.add(bRev);

            points.add(AnalyticsRevenuePointDto.builder()
                    .periodStart(period.toString())
                    .revenue(total)
                    .hotelRevenue(hRev)
                    .busRevenue(bRev)
                    .build());
        }

        logger.debug("Revenue trends [{} to {} - {}]: {} points generated",
                range.from(), range.to(), validGranularity, points.size());

        return AnalyticsRevenueResponseDto.builder()
                .granularity(validGranularity)
                .points(points)
                .build();
    }

    // -------------------------------------------------------------
    // 3. BOOKINGS TRENDS
    // -------------------------------------------------------------
    @Override
    public AnalyticsBookingsResponseDto getBookingsTrends(LocalDate from, LocalDate to, String granularity, String type, BookingStatus status) {
        ValidatedDateRange range = validateAndResolveDateRange(from, to);
        String validGranularity = validateGranularity(granularity);
        String validType = validateType(type, false);

        Map<LocalDate, Long> countMap = analyticsRepository.getBookingsCountByGranularity(
                range.from(), range.to(), validGranularity, validType, status
        );

        List<LocalDate> periods = generatePeriods(range.from(), range.to(), validGranularity);
        List<AnalyticsBookingPointDto> points = new ArrayList<>(periods.size());

        for (LocalDate period : periods) {
            Long count = countMap.getOrDefault(period, 0L);
            points.add(AnalyticsBookingPointDto.builder()
                    .periodStart(period.toString())
                    .count(count)
                    .build());
        }

        logger.debug("Bookings trends [{} to {} - {} - type: {}]: {} points generated",
                range.from(), range.to(), validGranularity, validType, points.size());

        return AnalyticsBookingsResponseDto.builder()
                .granularity(validGranularity)
                .points(points)
                .build();
    }

    // -------------------------------------------------------------
    // 4. BOOKINGS BY STATUS
    // -------------------------------------------------------------
    @Override
    public AnalyticsBookingStatusResponseDto getBookingsByStatus(LocalDate from, LocalDate to, String type) {
        ValidatedDateRange range = validateAndResolveDateRange(from, to);
        String validType = validateType(type, false);

        Map<BookingStatus, Long> counts = new EnumMap<>(BookingStatus.class);

        if ("HOTEL".equalsIgnoreCase(validType)) {
            counts.putAll(analyticsRepository.getHotelBookingsByStatus(range.from(), range.to()));
        } else if ("BUS".equalsIgnoreCase(validType)) {
            counts.putAll(analyticsRepository.getBusBookingsByStatus(range.from(), range.to()));
        } else {
            Map<BookingStatus, Long> hotelCounts = analyticsRepository.getHotelBookingsByStatus(range.from(), range.to());
            Map<BookingStatus, Long> busCounts = analyticsRepository.getBusBookingsByStatus(range.from(), range.to());
            for (var entry : hotelCounts.entrySet()) {
                counts.put(entry.getKey(), entry.getValue());
            }
            for (var entry : busCounts.entrySet()) {
                counts.merge(entry.getKey(), entry.getValue(), Long::sum);
            }
        }

        // Guarantee all lifecycle statuses are present (PENDING, CONFIRMED, CANCELLED, COMPLETED)
        List<BookingStatus> lifecycleStatuses = List.of(
                BookingStatus.PENDING,
                BookingStatus.CONFIRMED,
                BookingStatus.CANCELLED,
                BookingStatus.COMPLETED
        );

        List<AnalyticsBookingStatusItemDto> items = new ArrayList<>(lifecycleStatuses.size());
        for (BookingStatus st : lifecycleStatuses) {
            items.add(AnalyticsBookingStatusItemDto.builder()
                    .status(st)
                    .count(counts.getOrDefault(st, 0L))
                    .build());
        }

        logger.debug("Bookings status breakdown [{} to {} - type: {}]: {} items",
                range.from(), range.to(), validType, items.size());

        return AnalyticsBookingStatusResponseDto.builder()
                .items(items)
                .build();
    }

    // -------------------------------------------------------------
    // 5. TOP HOTELS
    // -------------------------------------------------------------
    @Override
    public AnalyticsTopHotelsResponseDto getTopHotels(LocalDate from, LocalDate to, Integer limit, String sortBy) {
        ValidatedDateRange range = validateAndResolveDateRange(from, to);
        String validSortBy = validateSortBy(sortBy);
        int validLimit = validateLimit(limit, 10);

        List<AnalyticsTopHotelItemDto> items = analyticsRepository.getTopHotels(
                range.from(), range.to(), validSortBy, validLimit
        );

        logger.debug("Top hotels [{} to {} - sort: {} - limit: {}]: {} hotels found",
                range.from(), range.to(), validSortBy, validLimit, items.size());

        return AnalyticsTopHotelsResponseDto.builder()
                .items(items)
                .build();
    }

    // -------------------------------------------------------------
    // 6. OCCUPANCY
    // -------------------------------------------------------------
    @Override
    public AnalyticsOccupancyResponseDto getOccupancy(LocalDate from, LocalDate to, Long hotelId) {
        ValidatedDateRange range = validateAndResolveDateRange(from, to);

        List<AnalyticsOccupancyItemDto> items = analyticsRepository.getHotelOccupancy(
                range.from(), range.to(), hotelId
        );

        logger.debug("Occupancy [{} to {} - hotelId: {}]: {} hotels evaluated",
                range.from(), range.to(), hotelId, items.size());

        return AnalyticsOccupancyResponseDto.builder()
                .items(items)
                .build();
    }

    // -------------------------------------------------------------
    // 7. BUS TRIPS LOAD FACTOR
    // -------------------------------------------------------------
    @Override
    public AnalyticsBusTripsResponseDto getBusTrips(LocalDate from, LocalDate to, Long routeId, Integer limit) {
        ValidatedDateRange range = validateAndResolveDateRange(from, to);
        int validLimit = validateLimit(limit, 20);

        LocalDateTime fromDateTime = range.from().atStartOfDay(AnalyticsConstants.CAIRO_ZONE).toLocalDateTime();
        LocalDateTime toNextDayDateTime = range.to().plusDays(1).atStartOfDay(AnalyticsConstants.CAIRO_ZONE).toLocalDateTime();

        List<AnalyticsBusTripItemDto> items = analyticsRepository.getBusTripsAnalytics(
                fromDateTime, toNextDayDateTime, routeId, validLimit
        );

        logger.debug("Bus trips load factor [{} to {} - route: {} - limit: {}]: {} trips returned",
                range.from(), range.to(), routeId, validLimit, items.size());

        return AnalyticsBusTripsResponseDto.builder()
                .items(items)
                .build();
    }

    // -------------------------------------------------------------
    // 8. PAYMENTS
    // -------------------------------------------------------------
    @Override
    public AnalyticsPaymentsResponseDto getPayments(LocalDate from, LocalDate to) {
        ValidatedDateRange range = validateAndResolveDateRange(from, to);

        LocalDateTime fromDateTime = range.from().atStartOfDay(AnalyticsConstants.CAIRO_ZONE).toLocalDateTime();
        LocalDateTime toNextDayDateTime = range.to().plusDays(1).atStartOfDay(AnalyticsConstants.CAIRO_ZONE).toLocalDateTime();

        List<AnalyticsPaymentItemDto> items = analyticsRepository.getPaymentsAnalytics(
                fromDateTime, toNextDayDateTime
        );

        logger.debug("Payments analytics [{} to {}]: {} groups returned",
                range.from(), range.to(), items.size());

        return AnalyticsPaymentsResponseDto.builder()
                .items(items)
                .build();
    }

    // -------------------------------------------------------------
    // PERIOD GENERATOR (ZERO-FILL HELPER)
    // -------------------------------------------------------------
    private List<LocalDate> generatePeriods(LocalDate from, LocalDate to, String granularity) {
        List<LocalDate> periods = new ArrayList<>();
        if ("DAY".equalsIgnoreCase(granularity)) {
            LocalDate curr = from;
            while (!curr.isAfter(to)) {
                periods.add(curr);
                curr = curr.plusDays(1);
            }
        } else if ("WEEK".equalsIgnoreCase(granularity)) {
            // PostgreSQL date_trunc('week', ...) aligns to Monday
            LocalDate curr = from.with(DayOfWeek.MONDAY);
            LocalDate end = to.with(DayOfWeek.MONDAY);
            while (!curr.isAfter(end)) {
                periods.add(curr);
                curr = curr.plusWeeks(1);
            }
        } else if ("MONTH".equalsIgnoreCase(granularity)) {
            // PostgreSQL date_trunc('month', ...) aligns to first day of month
            LocalDate curr = from.withDayOfMonth(1);
            LocalDate end = to.withDayOfMonth(1);
            while (!curr.isAfter(end)) {
                periods.add(curr);
                curr = curr.plusMonths(1);
            }
        }
        return periods;
    }

    private Long toLong(Object val) {
        if (val == null) return 0L;
        if (val instanceof Number n) return n.longValue();
        return Long.parseLong(val.toString());
    }

    private BigDecimal toBigDecimal(Object val) {
        if (val == null) return BigDecimal.ZERO;
        if (val instanceof BigDecimal bd) return bd;
        return new BigDecimal(val.toString());
    }
}
