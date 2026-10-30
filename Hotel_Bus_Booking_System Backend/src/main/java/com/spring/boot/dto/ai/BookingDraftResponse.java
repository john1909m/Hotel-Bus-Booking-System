package com.spring.boot.dto.ai;

import com.spring.boot.enums.DraftStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Data Transfer Object for BookingDraft response.
 * Supports both multi-room / multi-seat structures and backward-compatible single fields.
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

    // Legacy single room info (deprecated: use roomIds or rooms)
    @Schema(description = "Single room ID (deprecated: use roomIds or rooms)", deprecated = true)
    private Long roomId;
    private String roomNumber;
    private String roomType; // e.g. "SINGLE", "DOUBLE", "SUITE"
    private Integer roomCapacity;
    private BigDecimal pricePerNight;

    // Multi-room info
    @Schema(description = "List of chosen room IDs")
    private List<Long> roomIds;

    @Schema(description = "Detailed snapshots of all chosen rooms")
    private List<DraftRoomSnapshotDto> rooms;

    // Dates and guests
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Long nights;

    @Schema(description = "Total number of guests (adults + children)", example = "3")
    private Integer guests;

    @Schema(description = "Number of adults (>= 1)", example = "2")
    private Integer adults;

    @Schema(description = "List of child ages (0-17)", example = "[5]")
    private List<Integer> childAges;

    // Going trip info
    private Long goingTripId;
    @Schema(description = "Single going seat ID (deprecated: use goingSeatIds or goingSeats)", deprecated = true)
    private Long goingSeatId;
    private String goingSeatNumber;
    private String goingSeatType;
    private BigDecimal goingTripPrice;
    private String goingTripOrigin;
    private String goingTripDestination;
    private LocalDateTime goingTripDepartureTime;
    private LocalDateTime goingTripArrivalTime;

    @Schema(description = "List of seat IDs chosen for the going trip")
    private List<Long> goingSeatIds;

    @Schema(description = "Snapshots of all seats chosen for the going trip")
    private List<DraftSeatSnapshotDto> goingSeats;

    // Return trip info
    private Long returnTripId;
    @Schema(description = "Single return seat ID (deprecated: use returnSeatIds or returnSeats)", deprecated = true)
    private Long returnSeatId;
    private String returnSeatNumber;
    private String returnSeatType;
    private BigDecimal returnTripPrice;
    private String returnTripOrigin;
    private String returnTripDestination;
    private LocalDateTime returnTripDepartureTime;
    private LocalDateTime returnTripArrivalTime;

    @Schema(description = "List of seat IDs chosen for the return trip")
    private List<Long> returnSeatIds;

    @Schema(description = "Snapshots of all seats chosen for the return trip")
    private List<DraftSeatSnapshotDto> returnSeats;

    @Schema(description = "Number of transport passengers", example = "2")
    private Integer transportPassengers;

    // Pricing breakdown
    private BigDecimal hotelTotal;
    private BigDecimal goingTransportPrice;
    private BigDecimal returnTransportPrice;
    private BigDecimal totalPrice;

    // Booking ID (hotel booking ID) after confirmation
    private Long bookingId;

    // Confirmed bus booking IDs
    private List<Long> busBookingIds;
}
