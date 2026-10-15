package com.spring.boot.dto.ai;

import com.spring.boot.enums.BookingStatus;
import com.spring.boot.enums.DraftStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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
    private Integer guests;

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