package com.spring.boot.model;

import jakarta.persistence.Embeddable;
import lombok.*;

/**
 * Snapshot of a seat selection stored within a BookingDraft.
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DraftSeatSnapshot {

    private Long seatId;
    private String seatNumber;
    private String seatType;
}

