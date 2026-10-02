package com.spring.boot.model;

import com.spring.boot.enums.SeatType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * BusSeat entity representing an individual seat belonging to a bus.
 */
@Entity
@Table(name = "bus_seats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BusSeat extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "seat_number", nullable = false)
    private String seatNumber;

    @Column(name = "seat_type")
    @Enumerated(EnumType.STRING)
    private SeatType seatType;

    // Relationships
    @ManyToOne
    private Bus bus;
}