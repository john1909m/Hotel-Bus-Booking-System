package com.spring.boot.dto.ai;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/**
 * Selections the user made for booking draft reservation.
 * Supports multi-room hotel booking and multi-seat bus transport booking.
 * Identity always comes from the authenticated JWT security context, never from the client.
 */
public record BookingDraftRequest(
        @NotNull
        @Schema(description = "Hotel ID to book", example = "1")
        Long hotelId,

        @Schema(description = "Single room ID (deprecated fallback for roomIds: treated as a list of one)", example = "1", deprecated = true)
        Long roomId,

        @Schema(description = "List of room IDs for multi-room booking (1-10 rooms in the same hotel, no duplicates)", example = "[1, 2]")
        List<Long> roomIds,

        @NotNull
        @Schema(description = "Check-in date (yyyy-MM-dd)", example = "2026-11-01")
        LocalDate checkInDate,

        @NotNull
        @Schema(description = "Check-out date (yyyy-MM-dd)", example = "2026-11-05")
        LocalDate checkOutDate,

        @Schema(description = "Legacy guest count (backward compatibility fallback)", example = "2", deprecated = true)
        Integer guests,

        @Schema(description = "Number of adults (required, >= 1)", example = "2")
        Integer adults,

        @Schema(description = "List of child ages (0-17). In hotel rooms, children under 12 do not count towards room capacity.", example = "[5]")
        List<Integer> childAges,

        // Optional bus transport
        @Schema(description = "Outgoing bus trip ID", example = "10")
        Long goingTripId,

        @Schema(description = "Single outgoing seat ID (deprecated fallback for goingSeatIds: treated as a list of one)", example = "5", deprecated = true)
        Long goingSeatId,

        @Schema(description = "List of outgoing seat IDs on the going trip", example = "[5, 6]")
        List<Long> goingSeatIds,

        @Schema(description = "Return bus trip ID", example = "12")
        Long returnTripId,

        @Schema(description = "Single return seat ID (deprecated fallback for returnSeatIds: treated as a list of one)", example = "8", deprecated = true)
        Long returnSeatId,

        @Schema(description = "List of return seat IDs on the return trip", example = "[8, 9]")
        List<Long> returnSeatIds,

        @Schema(description = "Number of passengers covered by transport. Must equal the number of seats per direction, " +
                "and transport passengers must not exceed total hotel guests (adults + all children). " +
                "Rule: On the bus, children under 12 still occupy a seat and must be counted.", example = "2")
        Integer transportPassengers
) {
    public BookingDraftRequest {
        if (childAges == null) {
            childAges = List.of();
        }
        if (adults == null && guests != null) {
            adults = guests;
        }
        if (guests == null && adults != null) {
            guests = adults + childAges.size();
        }

        // Fallback normalization for roomIds / roomId
        if ((roomIds == null || roomIds.isEmpty()) && roomId != null) {
            roomIds = List.of(roomId);
        } else if (roomIds != null && !roomIds.isEmpty() && roomId == null) {
            roomId = roomIds.get(0);
        }

        // Fallback normalization for goingSeatIds / goingSeatId
        if ((goingSeatIds == null || goingSeatIds.isEmpty()) && goingSeatId != null) {
            goingSeatIds = List.of(goingSeatId);
        } else if (goingSeatIds != null && !goingSeatIds.isEmpty() && goingSeatId == null) {
            goingSeatId = goingSeatIds.get(0);
        }

        // Fallback normalization for returnSeatIds / returnSeatId
        if ((returnSeatIds == null || returnSeatIds.isEmpty()) && returnSeatId != null) {
            returnSeatIds = List.of(returnSeatId);
        } else if (returnSeatIds != null && !returnSeatIds.isEmpty() && returnSeatId == null) {
            returnSeatId = returnSeatIds.get(0);
        }

        // Default transport passengers to seat count if present, else total hotel guests
        if (transportPassengers == null) {
            if (goingSeatIds != null && !goingSeatIds.isEmpty()) {
                transportPassengers = goingSeatIds.size();
            } else if (returnSeatIds != null && !returnSeatIds.isEmpty()) {
                transportPassengers = returnSeatIds.size();
            } else if (guests != null) {
                transportPassengers = guests;
            }
        }
    }

    // Backward-compatible constructor: legacy single room and single seat
    public BookingDraftRequest(Long hotelId, Long roomId, LocalDate checkInDate, LocalDate checkOutDate, Integer guests,
                              Long goingTripId, Long goingSeatId, Long returnTripId, Long returnSeatId) {
        this(hotelId, roomId, roomId != null ? List.of(roomId) : List.of(), checkInDate, checkOutDate,
             guests, guests, List.of(),
             goingTripId, goingSeatId, goingSeatId != null ? List.of(goingSeatId) : List.of(),
             returnTripId, returnSeatId, returnSeatId != null ? List.of(returnSeatId) : List.of(), null);
    }

    // Backward-compatible constructor: single room and single seat with adults & child ages
    public BookingDraftRequest(Long hotelId, Long roomId, LocalDate checkInDate, LocalDate checkOutDate, Integer guests,
                              Integer adults, List<Integer> childAges,
                              Long goingTripId, Long goingSeatId, Long returnTripId, Long returnSeatId) {
        this(hotelId, roomId, roomId != null ? List.of(roomId) : List.of(), checkInDate, checkOutDate,
             guests, adults, childAges,
             goingTripId, goingSeatId, goingSeatId != null ? List.of(goingSeatId) : List.of(),
             returnTripId, returnSeatId, returnSeatId != null ? List.of(returnSeatId) : List.of(), null);
    }
}
