package com.spring.boot.controller;

import com.spring.boot.dto.analytics.*;
import com.spring.boot.enums.BookingStatus;
import com.spring.boot.enums.PaymentMethod;
import com.spring.boot.enums.PaymentStatus;
import com.spring.boot.exception.AnalyticsValidationException;
import com.spring.boot.exception.GlobalExceptionHandler;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.service.interfaces.AnalyticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AnalyticsControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AnalyticsService analyticsService;

    @Mock
    private BundleMessageService bundleMessageService;

    @InjectMocks
    private AnalyticsController analyticsController;

    @BeforeEach
    void setUp() {
        GlobalExceptionHandler exceptionHandler = new GlobalExceptionHandler(bundleMessageService);
        mockMvc = MockMvcBuilders.standaloneSetup(analyticsController)
                .setControllerAdvice(exceptionHandler)
                .build();
    }

    @Test
    @DisplayName("GET /api/admin/analytics/summary returns 200 and JSON summary")
    void testGetSummary_Success() throws Exception {
        AnalyticsSummaryDto dto = AnalyticsSummaryDto.builder()
                .totalHotels(10L)
                .totalRooms(50L)
                .totalBuses(5L)
                .totalCustomers(100L)
                .hotelBookings(12L)
                .busBookings(20L)
                .activeBookings(28L)
                .cancelledBookings(4L)
                .revenue(new BigDecimal("15000.00"))
                .hotelRevenue(new BigDecimal("10000.00"))
                .busRevenue(new BigDecimal("5000.00"))
                .build();

        when(analyticsService.getSummary(any(), any())).thenReturn(dto);

        mockMvc.perform(get("/api/admin/analytics/summary")
                        .param("from", "2026-05-01")
                        .param("to", "2026-05-10")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalHotels").value(10))
                .andExpect(jsonPath("$.totalRooms").value(50))
                .andExpect(jsonPath("$.totalBuses").value(5))
                .andExpect(jsonPath("$.totalCustomers").value(100))
                .andExpect(jsonPath("$.revenue").value(15000.00))
                .andExpect(jsonPath("$.hotelRevenue").value(10000.00))
                .andExpect(jsonPath("$.busRevenue").value(5000.00));
    }

    @Test
    @DisplayName("GET /api/admin/analytics/revenue returns 200 and points")
    void testGetRevenueTrends_Success() throws Exception {
        AnalyticsRevenueResponseDto dto = AnalyticsRevenueResponseDto.builder()
                .granularity("DAY")
                .points(List.of(
                        AnalyticsRevenuePointDto.builder()
                                .periodStart("2026-05-01")
                                .revenue(new BigDecimal("1500.00"))
                                .hotelRevenue(new BigDecimal("1000.00"))
                                .busRevenue(new BigDecimal("500.00"))
                                .build()
                ))
                .build();

        when(analyticsService.getRevenueTrends(any(), any(), eq("DAY"))).thenReturn(dto);

        mockMvc.perform(get("/api/admin/analytics/revenue")
                        .param("from", "2026-05-01")
                        .param("to", "2026-05-10")
                        .param("granularity", "DAY")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.granularity").value("DAY"))
                .andExpect(jsonPath("$.points[0].periodStart").value("2026-05-01"))
                .andExpect(jsonPath("$.points[0].revenue").value(1500.00));
    }

    @Test
    @DisplayName("GET /api/admin/analytics/bookings returns 200 and points")
    void testGetBookingsTrends_Success() throws Exception {
        AnalyticsBookingsResponseDto dto = AnalyticsBookingsResponseDto.builder()
                .granularity("DAY")
                .points(List.of(
                        AnalyticsBookingPointDto.builder()
                                .periodStart("2026-05-01")
                                .count(5L)
                                .build()
                ))
                .build();

        when(analyticsService.getBookingsTrends(any(), any(), eq("DAY"), isNull(), isNull())).thenReturn(dto);

        mockMvc.perform(get("/api/admin/analytics/bookings")
                        .param("from", "2026-05-01")
                        .param("to", "2026-05-10")
                        .param("granularity", "DAY")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.granularity").value("DAY"))
                .andExpect(jsonPath("$.points[0].count").value(5));
    }

    @Test
    @DisplayName("GET /api/admin/analytics/bookings/status returns 200 and items")
    void testGetBookingsByStatus_Success() throws Exception {
        AnalyticsBookingStatusResponseDto dto = AnalyticsBookingStatusResponseDto.builder()
                .items(List.of(
                        new AnalyticsBookingStatusItemDto(BookingStatus.PENDING, 2L),
                        new AnalyticsBookingStatusItemDto(BookingStatus.CONFIRMED, 10L),
                        new AnalyticsBookingStatusItemDto(BookingStatus.CANCELLED, 1L),
                        new AnalyticsBookingStatusItemDto(BookingStatus.COMPLETED, 5L)
                ))
                .build();

        when(analyticsService.getBookingsByStatus(any(), any(), isNull())).thenReturn(dto);

        mockMvc.perform(get("/api/admin/analytics/bookings/status")
                        .param("from", "2026-05-01")
                        .param("to", "2026-05-10")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].status").value("PENDING"))
                .andExpect(jsonPath("$.items[0].count").value(2))
                .andExpect(jsonPath("$.items[1].status").value("CONFIRMED"))
                .andExpect(jsonPath("$.items[1].count").value(10));
    }

    @Test
    @DisplayName("GET /api/admin/analytics/hotels/top returns 200 and items")
    void testGetTopHotels_Success() throws Exception {
        AnalyticsTopHotelsResponseDto dto = AnalyticsTopHotelsResponseDto.builder()
                .items(List.of(
                        new AnalyticsTopHotelItemDto(1L, "Grand Nile", "Cairo", 25L, new BigDecimal("50000.00"))
                ))
                .build();

        when(analyticsService.getTopHotels(any(), any(), eq(10), eq("REVENUE"))).thenReturn(dto);

        mockMvc.perform(get("/api/admin/analytics/hotels/top")
                        .param("from", "2026-05-01")
                        .param("to", "2026-05-10")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].hotelId").value(1))
                .andExpect(jsonPath("$.items[0].hotelName").value("Grand Nile"))
                .andExpect(jsonPath("$.items[0].revenue").value(50000.00));
    }

    @Test
    @DisplayName("GET /api/admin/analytics/occupancy returns 200 and items")
    void testGetOccupancy_Success() throws Exception {
        AnalyticsOccupancyResponseDto dto = AnalyticsOccupancyResponseDto.builder()
                .items(List.of(
                        new AnalyticsOccupancyItemDto(1L, "Grand Nile", 45L, 100L, 0.45)
                ))
                .build();

        when(analyticsService.getOccupancy(any(), any(), isNull())).thenReturn(dto);

        mockMvc.perform(get("/api/admin/analytics/occupancy")
                        .param("from", "2026-05-01")
                        .param("to", "2026-05-10")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].hotelId").value(1))
                .andExpect(jsonPath("$.items[0].roomNightsSold").value(45))
                .andExpect(jsonPath("$.items[0].roomNightsAvailable").value(100))
                .andExpect(jsonPath("$.items[0].occupancyRate").value(0.45));
    }

    @Test
    @DisplayName("GET /api/admin/analytics/bus-trips returns 200 and items")
    void testGetBusTrips_Success() throws Exception {
        AnalyticsBusTripsResponseDto dto = AnalyticsBusTripsResponseDto.builder()
                .items(List.of(
                        new AnalyticsBusTripItemDto(12L, "Cairo to Alexandria",
                                LocalDateTime.of(2026, 5, 10, 8, 0),
                                35L, 50, 0.70)
                ))
                .build();

        when(analyticsService.getBusTrips(any(), any(), isNull(), eq(20))).thenReturn(dto);

        mockMvc.perform(get("/api/admin/analytics/bus-trips")
                        .param("from", "2026-05-01")
                        .param("to", "2026-05-10")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].tripId").value(12))
                .andExpect(jsonPath("$.items[0].routeName").value("Cairo to Alexandria"))
                .andExpect(jsonPath("$.items[0].bookedSeats").value(35))
                .andExpect(jsonPath("$.items[0].totalSeats").value(50))
                .andExpect(jsonPath("$.items[0].loadFactor").value(0.70));
    }

    @Test
    @DisplayName("GET /api/admin/analytics/payments returns 200 and items")
    void testGetPayments_Success() throws Exception {
        AnalyticsPaymentsResponseDto dto = AnalyticsPaymentsResponseDto.builder()
                .items(List.of(
                        new AnalyticsPaymentItemDto(PaymentMethod.CREDIT_CARD, PaymentStatus.COMPLETED, 15L, new BigDecimal("25000.00"))
                ))
                .build();

        when(analyticsService.getPayments(any(), any())).thenReturn(dto);

        mockMvc.perform(get("/api/admin/analytics/payments")
                        .param("from", "2026-05-01")
                        .param("to", "2026-05-10")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].paymentMethod").value("CREDIT_CARD"))
                .andExpect(jsonPath("$.items[0].paymentStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.items[0].count").value(15))
                .andExpect(jsonPath("$.items[0].amount").value(25000.00));
    }

    @Test
    @DisplayName("Validation error returns 400 with structured field-level JSON")
    void testValidationError_Returns400FieldLevelJson() throws Exception {
        when(analyticsService.getSummary(any(), any()))
                .thenThrow(new AnalyticsValidationException("from", "error.date_range_invalid"));
        when(bundleMessageService.getMessage("error.date_range_invalid"))
                .thenReturn("Start date must be before or equal to end date");

        mockMvc.perform(get("/api/admin/analytics/summary")
                        .param("from", "2026-05-10")
                        .param("to", "2026-05-01")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Start date must be before or equal to end date"))
                .andExpect(jsonPath("$.errors.from").value("Start date must be before or equal to end date"));
    }
}
