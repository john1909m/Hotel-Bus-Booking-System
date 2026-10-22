package com.spring.boot.dto.ai;

import com.spring.boot.enums.BookingStatus;
import com.spring.boot.enums.DraftStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Data Transfer Object for BookingDraft response.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingDraftResponse {

    private Long id;
    private DraftStatus status;
    private LocalDateTime expiresAt;

    // Hotel info
    private Long hotelId;
    private String hotelName;

    // Room info
    private Long roomId;
    private String roomNumber;
    private String roomType; // e.g., "SINGLE", "DOUBLE"
    private Integer roomCapacity;
    private BigDecimal pricePerNight;

    // Dates and guests
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Long nights;
    @Schema(description = "Total number of guests (adults + children)", example = "3")
    private Integer guests;
    @Schema(description = "Number of adults (>= 1)", example = "2")
    private Integer adults;
    @Schema(description = "List of child ages (0-17)", example = "[5]")
    private java.util.List<Integer> childAges;

    // Going trip
    private Long goingTripId;
    private Long goingSeatId;
    private String goingSeatNumber;
    private String goingSeatType;
    private BigDecimal goingTripPrice;
    private String goingTripOrigin;
    private String goingTripDestination;
    private LocalDateTime goingTripDepartureTime;
    private LocalDateTime goingTripArrivalTime;

    // Return trip
    private Long returnTripId;
    private Long returnSeatId;
    private String returnSeatNumber;
    private String returnSeatType;
    private BigDecimal returnTripPrice;
    private String returnTripOrigin;
    private String returnTripDestination;
    private LocalDateTime returnTripDepartureTime;
    private LocalDateTime returnTripArrivalTime;

    // Pricing breakdown
    private BigDecimal hotelTotal;
    private BigDecimal goingTransportPrice;
    private BigDecimal returnTransportPrice;
    private BigDecimal totalPrice;

    // Booking ID (hotel booking ID) after confirmation
    private Long bookingId;
}