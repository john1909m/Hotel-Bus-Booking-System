package com.spring.boot.service.impl;

import com.spring.boot.dto.analytics.*;
import com.spring.boot.enums.BookingStatus;
import com.spring.boot.enums.PaymentMethod;
import com.spring.boot.enums.PaymentStatus;
import com.spring.boot.exception.AnalyticsValidationException;
import com.spring.boot.repository.AnalyticsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceImplTest {

    @Mock
    private AnalyticsRepository analyticsRepository;

    @InjectMocks
    private AnalyticsServiceImpl analyticsService;

    private LocalDate from;
    private LocalDate to;

    @BeforeEach
    void setUp() {
        from = LocalDate.of(2026, 5, 1);
        to = LocalDate.of(2026, 5, 10);
    }

    // -------------------------------------------------------------
    // VALIDATION TESTS
    // -------------------------------------------------------------

    @Test
    @DisplayName("Should throw 400 error when from date is after to date")
    void testValidateDateRange_FromAfterTo() {
        LocalDate invalidFrom = LocalDate.of(2026, 5, 10);
        LocalDate invalidTo = LocalDate.of(2026, 5, 1);

        AnalyticsValidationException ex = assertThrows(AnalyticsValidationException.class, () ->
                analyticsService.getSummary(invalidFrom, invalidTo)
        );
        assertEquals("from", ex.getField());
        assertEquals("error.date_range_invalid", ex.getMessageKey());
    }

    @Test
    @DisplayName("Should throw 400 error when date range exceeds 366 days")
    void testValidateDateRange_Exceeds366Days() {
        LocalDate start = LocalDate.of(2025, 1, 1);
        LocalDate end = LocalDate.of(2026, 2, 1); // 397 days

        AnalyticsValidationException ex = assertThrows(AnalyticsValidationException.class, () ->
                analyticsService.getSummary(start, end)
        );
        assertEquals("range", ex.getField());
        assertEquals("error.date_range_exceeded", ex.getMessageKey());
    }

    @Test
    @DisplayName("Should default to last 30 days ending today in Cairo when from/to are absent")
    void testValidateDateRange_DefaultsToLast30Days() {
        when(analyticsRepository.countTotalHotels()).thenReturn(5L);
        when(analyticsRepository.countTotalRooms()).thenReturn(20L);
        when(analyticsRepository.countTotalBuses()).thenReturn(3L);
        when(analyticsRepository.countTotalCustomers()).thenReturn(10L);
        when(analyticsRepository.getHotelBookingStats(any(), any())).thenReturn(new Object[]{0L, 0L, 0L, BigDecimal.ZERO});
        when(analyticsRepository.getBusBookingStats(any(), any())).thenReturn(new Object[]{0L, 0L, 0L, BigDecimal.ZERO});

        AnalyticsSummaryDto summary = analyticsService.getSummary(null, null);
        assertNotNull(summary);
        verify(analyticsRepository).getHotelBookingStats(any(LocalDate.class), any(LocalDate.class));
    }

    @Test
    @DisplayName("Should throw 400 error when invalid granularity is passed")
    void testValidateGranularity_Invalid() {
        AnalyticsValidationException ex = assertThrows(AnalyticsValidationException.class, () ->
                analyticsService.getRevenueTrends(from, to, "HOURLY")
        );
        assertEquals("granularity", ex.getField());
        assertEquals("error.granularity_invalid", ex.getMessageKey());
    }

    @Test
    @DisplayName("Should throw 400 error when invalid booking type is passed")
    void testValidateType_Invalid() {
        AnalyticsValidationException ex = assertThrows(AnalyticsValidationException.class, () ->
                analyticsService.getBookingsTrends(from, to, "DAY", "FLIGHT", null)
        );
        assertEquals("type", ex.getField());
        assertEquals("error.booking_type_invalid", ex.getMessageKey());
    }

    @Test
    @DisplayName("Should throw 400 error when invalid sortBy is passed")
    void testValidateSortBy_Invalid() {
        AnalyticsValidationException ex = assertThrows(AnalyticsValidationException.class, () ->
                analyticsService.getTopHotels(from, to, 10, "INVALID_SORT")
        );
        assertEquals("sortBy", ex.getField());
        assertEquals("error.sort_by_invalid", ex.getMessageKey());
    }

    @Test
    @DisplayName("Should throw 400 error when limit is outside 1..50")
    void testValidateLimit_Invalid() {
        AnalyticsValidationException exBelow = assertThrows(AnalyticsValidationException.class, () ->
                analyticsService.getTopHotels(from, to, 0, "REVENUE")
        );
        assertEquals("limit", exBelow.getField());

        AnalyticsValidationException exAbove = assertThrows(AnalyticsValidationException.class, () ->
                analyticsService.getTopHotels(from, to, 51, "REVENUE")
        );
        assertEquals("limit", exAbove.getField());
    }

    // -------------------------------------------------------------
    // ENDPOINT 1: SUMMARY
    // -------------------------------------------------------------

    @Test
    @DisplayName("Summary: calculates total entities, bookings, and earned revenue")
    void testGetSummary() {
        when(analyticsRepository.countTotalHotels()).thenReturn(10L);
        when(analyticsRepository.countTotalRooms()).thenReturn(100L);
        when(analyticsRepository.countTotalBuses()).thenReturn(8L);
        when(analyticsRepository.countTotalCustomers()).thenReturn(50L);

        // Object[]: totalBookings, activeBookings, cancelledBookings, totalRevenue
        when(analyticsRepository.getHotelBookingStats(from, to))
                .thenReturn(new Object[]{12L, 10L, 2L, new BigDecimal("15000.00")});
        when(analyticsRepository.getBusBookingStats(from, to))
                .thenReturn(new Object[]{20L, 18L, 2L, new BigDecimal("6000.00")});

        AnalyticsSummaryDto result = analyticsService.getSummary(from, to);

        assertEquals(10L, result.getTotalHotels());
        assertEquals(100L, result.getTotalRooms());
        assertEquals(8L, result.getTotalBuses());
        assertEquals(50L, result.getTotalCustomers());
        assertEquals(12L, result.getHotelBookings());
        assertEquals(20L, result.getBusBookings());
        assertEquals(28L, result.getActiveBookings()); // 10 + 18
        assertEquals(4L, result.getCancelledBookings()); // 2 + 2
        assertEquals(new BigDecimal("21000.00"), result.getRevenue());
        assertEquals(new BigDecimal("15000.00"), result.getHotelRevenue());
        assertEquals(new BigDecimal("6000.00"), result.getBusRevenue());
    }

    // -------------------------------------------------------------
    // ENDPOINT 2: REVENUE TRENDS WITH ZERO-FILLING
    // -------------------------------------------------------------

    @Test
    @DisplayName("Revenue trends: zero-fills missing periods with no gaps")
    void testGetRevenueTrends_ZeroFilled() {
        Map<LocalDate, BigDecimal> hotelRev = new HashMap<>();
        hotelRev.put(LocalDate.of(2026, 5, 2), new BigDecimal("1000.00"));
        hotelRev.put(LocalDate.of(2026, 5, 5), new BigDecimal("2500.00"));

        Map<LocalDate, BigDecimal> busRev = new HashMap<>();
        busRev.put(LocalDate.of(2026, 5, 2), new BigDecimal("300.00"));

        when(analyticsRepository.getHotelRevenueByGranularity(from, to, "DAY")).thenReturn(hotelRev);
        when(analyticsRepository.getBusRevenueByGranularity(from, to, "DAY")).thenReturn(busRev);

        AnalyticsRevenueResponseDto result = analyticsService.getRevenueTrends(from, to, "DAY");

        assertEquals("DAY", result.getGranularity());
        assertEquals(10, result.getPoints().size()); // May 1 to May 10 inclusive

        // May 1 should be zero-filled
        assertEquals("2026-05-01", result.getPoints().get(0).getPeriodStart());
        assertEquals(BigDecimal.ZERO, result.getPoints().get(0).getRevenue());

        // May 2 should have 1000 + 300 = 1300
        assertEquals("2026-05-02", result.getPoints().get(1).getPeriodStart());
        assertEquals(new BigDecimal("1300.00"), result.getPoints().get(1).getRevenue());
        assertEquals(new BigDecimal("1000.00"), result.getPoints().get(1).getHotelRevenue());
        assertEquals(new BigDecimal("300.00"), result.getPoints().get(1).getBusRevenue());
    }

    // -------------------------------------------------------------
    // ENDPOINT 3: BOOKINGS TRENDS WITH ZERO-FILLING
    // -------------------------------------------------------------

    @Test
    @DisplayName("Bookings trends: zero-fills missing periods")
    void testGetBookingsTrends_ZeroFilled() {
        Map<LocalDate, Long> countMap = new HashMap<>();
        countMap.put(LocalDate.of(2026, 5, 3), 4L);

        when(analyticsRepository.getBookingsCountByGranularity(from, to, "DAY", "HOTEL", BookingStatus.CONFIRMED))
                .thenReturn(countMap);

        AnalyticsBookingsResponseDto result = analyticsService.getBookingsTrends(from, to, "DAY", "HOTEL", BookingStatus.CONFIRMED);

        assertEquals("DAY", result.getGranularity());
        assertEquals(10, result.getPoints().size());
        assertEquals(0L, result.getPoints().get(0).getCount()); // May 1
        assertEquals(4L, result.getPoints().get(2).getCount()); // May 3
    }

    // -------------------------------------------------------------
    // ENDPOINT 4: BOOKINGS BY STATUS
    // -------------------------------------------------------------

    @Test
    @DisplayName("Bookings by status: ensures all enum values are present even if count is zero")
    void testGetBookingsByStatus_AllEnumsPresent() {
        Map<BookingStatus, Long> hotelStatus = Map.of(
                BookingStatus.CONFIRMED, 5L,
                BookingStatus.PENDING, 2L
        );
        when(analyticsRepository.getHotelBookingsByStatus(from, to)).thenReturn(hotelStatus);
        when(analyticsRepository.getBusBookingsByStatus(from, to)).thenReturn(Collections.emptyMap());

        AnalyticsBookingStatusResponseDto result = analyticsService.getBookingsByStatus(from, to, null);

        assertNotNull(result.getItems());
        assertEquals(4, result.getItems().size()); // PENDING, CONFIRMED, CANCELLED, COMPLETED

        Map<BookingStatus, Long> map = new HashMap<>();
        for (var item : result.getItems()) {
            map.put(item.getStatus(), item.getCount());
        }

        assertEquals(2L, map.get(BookingStatus.PENDING));
        assertEquals(5L, map.get(BookingStatus.CONFIRMED));
        assertEquals(0L, map.get(BookingStatus.CANCELLED));
        assertEquals(0L, map.get(BookingStatus.COMPLETED));
    }

    // -------------------------------------------------------------
    // ENDPOINT 5: TOP HOTELS
    // -------------------------------------------------------------

    @Test
    @DisplayName("Top hotels: returns ordered top hotels")
    void testGetTopHotels() {
        List<AnalyticsTopHotelItemDto> mockList = List.of(
                new AnalyticsTopHotelItemDto(1L, "Grand Nile", "Cairo", 20L, new BigDecimal("50000.00")),
                new AnalyticsTopHotelItemDto(2L, "Four Seasons", "Alexandria", 15L, new BigDecimal("35000.00"))
        );
        when(analyticsRepository.getTopHotels(from, to, "REVENUE", 10)).thenReturn(mockList);

        AnalyticsTopHotelsResponseDto result = analyticsService.getTopHotels(from, to, 10, "REVENUE");

        assertEquals(2, result.getItems().size());
        assertEquals("Grand Nile", result.getItems().get(0).getHotelName());
    }

    // -------------------------------------------------------------
    // ENDPOINT 6: OCCUPANCY
    // -------------------------------------------------------------

    @Test
    @DisplayName("Occupancy: returns calculated occupancy rate rounded to 2 decimals")
    void testGetOccupancy() {
        List<AnalyticsOccupancyItemDto> mockList = List.of(
                new AnalyticsOccupancyItemDto(1L, "Grand Nile", 45L, 100L, 0.45),
                new AnalyticsOccupancyItemDto(2L, "Empty Hotel", 0L, 0L, 0.00)
        );
        when(analyticsRepository.getHotelOccupancy(from, to, null)).thenReturn(mockList);

        AnalyticsOccupancyResponseDto result = analyticsService.getOccupancy(from, to, null);

        assertEquals(2, result.getItems().size());
        assertEquals(0.45, result.getItems().get(0).getOccupancyRate());
        assertEquals(0.00, result.getItems().get(1).getOccupancyRate());
    }

    // -------------------------------------------------------------
    // ENDPOINT 7: BUS TRIPS
    // -------------------------------------------------------------

    @Test
    @DisplayName("Bus trips: returns trips with load factor")
    void testGetBusTrips() {
        List<AnalyticsBusTripItemDto> mockList = List.of(
                new AnalyticsBusTripItemDto(10L, "Cairo -> Alex", LocalDateTime.of(2026, 5, 2, 8, 0), 35L, 50, 0.70)
        );
        when(analyticsRepository.getBusTripsAnalytics(any(), any(), isNull(), eq(20))).thenReturn(mockList);

        AnalyticsBusTripsResponseDto result = analyticsService.getBusTrips(from, to, null, 20);

        assertEquals(1, result.getItems().size());
        assertEquals(0.70, result.getItems().get(0).getLoadFactor());
    }

    // -------------------------------------------------------------
    // ENDPOINT 8: PAYMENTS
    // -------------------------------------------------------------

    @Test
    @DisplayName("Payments: returns payment breakdowns")
    void testGetPayments() {
        List<AnalyticsPaymentItemDto> mockList = List.of(
                new AnalyticsPaymentItemDto(PaymentMethod.CREDIT_CARD, PaymentStatus.COMPLETED, 15L, new BigDecimal("25000.00"))
        );
        when(analyticsRepository.getPaymentsAnalytics(any(), any())).thenReturn(mockList);

        AnalyticsPaymentsResponseDto result = analyticsService.getPayments(from, to);

        assertEquals(1, result.getItems().size());
        assertEquals(PaymentMethod.CREDIT_CARD, result.getItems().get(0).getPaymentMethod());
        assertEquals(new BigDecimal("25000.00"), result.getItems().get(0).getAmount());
    }
}
