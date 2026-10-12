package com.spring.boot.dto.ai;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * Selections the user made. No userId here: identity always comes from the JWT.
 * Adjust the field types/names to match your BookingDraft entity and existing booking DTOs.
 */
public record BookingDraftRequest(
        @NotNull Long hotelId,
        @NotNull Long roomId,
        @NotNull LocalDate checkInDate,
        @NotNull LocalDate checkOutDate,
        @NotNull @Min(1) Integer guests,

        // optional transport
        Long goingTripId,
        Long goingSeatId,
        Long returnTripId,
        Long returnSeatId
) {
}