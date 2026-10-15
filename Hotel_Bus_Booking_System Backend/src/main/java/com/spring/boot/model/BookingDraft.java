package com.spring.boot.model;

import com.spring.boot.enums.DraftStatus;
import com.spring.boot.enums.SeatType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
//import org.hibernate.annotations.Where;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;


@Entity
@Table(name = "booking_drafts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLDelete(sql = "UPDATE booking_drafts SET deleted = true WHERE id = ?")
//@Where(clause = "deleted = false")
public class BookingDraft extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // User reference (from JWT, not stored in draft for security)
    private Long userId;

    // Hotel selection
    private Long hotelId;
    private String hotelName;

    // Room selection
    private Long roomId;
    private String roomNumber;
    private Integer roomCapacity;
    private BigDecimal roomPricePerNight;

    // Dates and guests
    private LocalDate checkIn;
    private LocalDate checkOut;
    private Integer guests;

    // Optional bus selections
    private Long outgoingTripId;
    private Long returnTripId;
    private Long outgoingSeatId;
    private Long returnSeatId;

    // Going trip snapshot
    private String goingSeatNumber;
    private String goingSeatType;
    private BigDecimal goingTripPrice;
    private String goingTripOrigin;
    private String goingTripDestination;
    private LocalDateTime goingTripDepartureTime;
    private LocalDateTime goingTripArrivalTime;

    // Return trip snapshot
    private String returnSeatNumber;
    private String returnSeatType;
    private BigDecimal returnTripPrice;
    private String returnTripOrigin;
    private String returnTripDestination;
    private LocalDateTime returnTripDepartureTime;
    private LocalDateTime returnTripArrivalTime;

    // Pricing breakdown
    private BigDecimal hotelTotal;
    private BigDecimal goingTransportPrice;
    private BigDecimal returnTransportPrice;
    private BigDecimal totalPrice;

    // Draft status
    @Enumerated(EnumType.STRING)
    private DraftStatus status;

    // Expiry time (drafts expire after TTL from property)
    private LocalDateTime expiresAt;

    // Idempotency key for confirm endpoint
    private String idempotencyKey;

    // Confirmed booking ID (hotel booking ID)
    private Long confirmedBookingId;

    // Soft delete flag
    @Builder.Default
    private boolean deleted = false;
}
