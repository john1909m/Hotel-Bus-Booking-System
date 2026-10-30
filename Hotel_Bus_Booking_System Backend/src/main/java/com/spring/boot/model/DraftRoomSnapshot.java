package com.spring.boot.model;

import jakarta.persistence.Embeddable;
import lombok.*;

import java.math.BigDecimal;

/**
 * Snapshot of a room selection stored within a BookingDraft.
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DraftRoomSnapshot {

    private Long roomId;
    private String roomNumber;
    private String roomType;
    private Integer capacity;
    private BigDecimal pricePerNight;
}

