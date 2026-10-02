package com.spring.boot.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Bus entity representing a physical bus.
 */
@Entity
@Table(name = "buses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Bus extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bus_number", nullable = false, unique = true)
    private String busNumber;

    @Column(name = "company", nullable = false)
    private String company;

    @Column(name = "capacity", nullable = false)
    private Integer capacity;

    @Column(name = "bus_type")
    private String busType;

    // Relationships
    @OneToMany(mappedBy = "bus")
    private List<BusSeat> busSeats;

    @OneToMany(mappedBy = "bus")
    private List<BusTrip> busTrips;
}