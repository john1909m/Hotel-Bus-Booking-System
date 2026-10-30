package com.spring.boot.dto.ai;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

/**
 * DTO representing a snapshot of a chosen bus seat in a booking draft.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Details of a seat included in a booking draft")
public class DraftSeatSnapshotDto {

    @Schema(description = "Bus seat ID", example = "5")
    private Long seatId;

    @Schema(description = "Seat number", example = "12A")
    private String seatNumber;

    @Schema(description = "Seat type (e.g. STANDARD, VIP)", example = "STANDARD")
    private String seatType;
}

