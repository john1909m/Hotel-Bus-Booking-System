package com.spring.boot.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Join entity linking a HotelBooking to an individual Room.
 * Stores a snapshot of the pricePerNight at booking time.
 */
@Entity
@Table(name = "hotel_booking_rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HotelBookingRoom extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hotel_booking_id", nullable = false)
    private HotelBooking hotelBooking;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "price_per_night", nullable = false)
    private Double pricePerNight;
}
