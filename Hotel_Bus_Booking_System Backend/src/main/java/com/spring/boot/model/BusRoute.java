package com.spring.boot.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * BusRoute entity representing a logical transportation route.
 */
@Entity
@Table(name = "bus_routes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BusRoute extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "duration")
    private Integer duration; // in minutes

    // Relationships
    @ManyToOne
    @JoinColumn(name = "origin_stop_id", nullable = false)
    private BusStop originStop;

    @ManyToOne
    @JoinColumn(name = "destination_stop_id", nullable = false)
    private BusStop destinationStop;
}