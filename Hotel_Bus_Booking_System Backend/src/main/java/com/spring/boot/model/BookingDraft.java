package com.spring.boot.model;

import com.spring.boot.enums.DraftStatus;
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

    // Pricing
    private BigDecimal totalPrice;

    // Draft status
    @Enumerated(EnumType.STRING)
    private DraftStatus status;

    // Expiry time (drafts expire after 24 hours)
    private LocalDateTime expiresAt;

    // Soft delete flag
    private boolean deleted = false;
}
