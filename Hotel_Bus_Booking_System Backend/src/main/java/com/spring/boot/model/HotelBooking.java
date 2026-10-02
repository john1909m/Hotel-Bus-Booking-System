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
 * HotelBooking entity representing a hotel-room reservation.
 */
@Entity
@Table(name = "hotel_bookings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HotelBooking extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "check_in", nullable = false)
    private LocalDate checkIn;

    @Column(name = "check_out", nullable = false)
    private LocalDate checkOut;

    @Column(name = "guests", nullable = false)
    private Integer guests;

    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    private BookingStatus status;

    @Column(name = "total_price")
    private BigDecimal totalPrice;

    // Relationships
    @ManyToOne
    private User user;

    @ManyToOne
    private Room room;


    @ManyToOne
    @JoinColumn(name = "hotel_id")
    private Hotel hotel;
}