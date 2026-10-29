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

    @Column(name = "price_factor", nullable = false, precision = 4, scale = 2)
    private java.math.BigDecimal priceFactor = new java.math.BigDecimal("1.00");

    // Relationships
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "bus_features_link",
            joinColumns = @JoinColumn(name = "bus_id"),
            inverseJoinColumns = @JoinColumn(name = "feature_id"),
            uniqueConstraints = @UniqueConstraint(columnNames = {"bus_id", "feature_id"})
    )
    private java.util.Set<BusFeature> features = new java.util.HashSet<>();

    @OneToMany(mappedBy = "bus")
    private List<BusSeat> busSeats;

    @OneToMany(mappedBy = "bus")
    private List<BusTrip> busTrips;
}