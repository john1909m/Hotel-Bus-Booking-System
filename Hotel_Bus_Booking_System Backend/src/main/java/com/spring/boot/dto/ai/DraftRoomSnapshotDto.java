package com.spring.boot.dto.ai;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.math.BigDecimal;

/**
 * DTO representing a snapshot of a chosen room in a booking draft.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Details of a room included in a booking draft")
public class DraftRoomSnapshotDto {

    @Schema(description = "Room ID", example = "1")
    private Long roomId;

    @Schema(description = "Room number", example = "101")
    private String roomNumber;

    @Schema(description = "Room type (e.g. SINGLE, DOUBLE, SUITE)", example = "DOUBLE")
    private String roomType;

    @Schema(description = "Room capacity", example = "2")
    private Integer capacity;

    @Schema(description = "Price per night in EGP", example = "1500.00")
    private BigDecimal pricePerNight;
}

