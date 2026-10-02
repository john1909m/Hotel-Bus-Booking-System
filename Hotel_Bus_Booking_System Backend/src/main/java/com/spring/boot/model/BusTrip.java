package com.spring.boot.model;

import com.spring.boot.enums.BusTripStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * BusTrip entity representing a scheduled trip on a route.
 */
@Entity
@Table(name = "bus_trips")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BusTrip extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "departure_time", nullable = false)
    private LocalDateTime departureTime;

    @Column(name = "arrival_time", nullable = false)
    private LocalDateTime arrivalTime;

    @Column(name = "price", nullable = false)
    private BigDecimal price;

    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    private BusTripStatus status;

    // Relationships
    @ManyToOne
    private Bus bus;

    @ManyToOne
    private BusRoute route;
}