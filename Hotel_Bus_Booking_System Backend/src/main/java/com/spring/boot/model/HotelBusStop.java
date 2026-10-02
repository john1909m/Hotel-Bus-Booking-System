package com.spring.boot.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * HotelBusStop entity representing the relationship between a hotel and a nearby bus stop.
 */
@Entity
@Table(name = "hotel_bus_stops")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HotelBusStop extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "distance")
    private Double distance; // in kilometers

    // Relationships
    @ManyToOne
    private Hotel hotel;

    @ManyToOne
    private BusStop busStop;
}