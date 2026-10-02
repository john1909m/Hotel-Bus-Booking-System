package com.spring.boot.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * BusStop entity representing a transportation stop/station.
 */
@Entity
@Table(name = "bus_stops")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BusStop extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "city")
    private String city;

    @Column(name = "address")
    private String address;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    // Relationships
    @OneToMany(mappedBy = "busStop")
    private List<HotelBusStop> hotelBusStops;

    @OneToMany(mappedBy = "originStop")
    private List<BusRoute> originRoutes;

    @OneToMany(mappedBy = "destinationStop")
    private List<BusRoute> destinationRoutes;
}