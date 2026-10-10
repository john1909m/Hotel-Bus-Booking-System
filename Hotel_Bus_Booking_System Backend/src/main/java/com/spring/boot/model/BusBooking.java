package com.spring.boot.model;

import com.spring.boot.enums.BookingStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * BusBooking entity representing a user's reservation of a seat on a specific bus trip.
 */
@Entity
@Table(name = "bus_bookings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BusBooking extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "booking_date", nullable = false)
    private LocalDate bookingDate;

    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    private BookingStatus status;

    @Column(name = "price")
    private BigDecimal price;

    // Relationships
    @ManyToOne
    private Costumer costumer;

    @ManyToOne
    private BusTrip busTrip;

    @ManyToOne
    private BusSeat seat;
}