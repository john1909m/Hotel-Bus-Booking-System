package com.spring.boot.dto.ai;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/**
 * Selections the user made. No userId here: identity always comes from the JWT.
 * Adjust the field types/names to match your BookingDraft entity and existing booking DTOs.
 */
public record BookingDraftRequest(
        @NotNull Long hotelId,
        @NotNull Long roomId,
        @NotNull LocalDate checkInDate,
        @NotNull LocalDate checkOutDate,
        @Schema(description = "Legacy guest count (backward compatibility fallback)", example = "2", deprecated = true)
        Integer guests,
        @Schema(description = "Number of adults (required, >= 1)", example = "2")
        Integer adults,
        @Schema(description = "List of child ages (0-17). Children under 12 do not count towards room capacity.", example = "[5]")
        List<Integer> childAges,

        // optional transport
        Long goingTripId,
        Long goingSeatId,
        Long returnTripId,
        Long returnSeatId
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
    }

    public BookingDraftRequest(Long hotelId, Long roomId, LocalDate checkInDate, LocalDate checkOutDate, Integer guests,
                              Long goingTripId, Long goingSeatId, Long returnTripId, Long returnSeatId) {
        this(hotelId, roomId, checkInDate, checkOutDate, guests, guests, List.of(), goingTripId, goingSeatId, returnTripId, returnSeatId);
    }
}