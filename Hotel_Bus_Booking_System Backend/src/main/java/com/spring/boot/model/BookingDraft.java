package com.spring.boot.model;

import com.spring.boot.enums.DraftSource;
import com.spring.boot.enums.DraftStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(name = "booking_drafts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLDelete(sql = "UPDATE booking_drafts SET deleted = true WHERE id = ?")
public class BookingDraft extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // User reference (from JWT, not stored in draft for security)
    private Long userId;

    // Hotel selection
    private Long hotelId;
    private String hotelName;

    // Legacy single room selection (backward compatibility fallback)
    private Long roomId;
    private String roomNumber;
    private Integer roomCapacity;
    private BigDecimal roomPricePerNight;

    // Multi-room snapshot
    @ElementCollection
    @CollectionTable(name = "booking_draft_rooms", joinColumns = @JoinColumn(name = "draft_id"))
    @OrderColumn(name = "room_order")
    @Builder.Default
    private List<DraftRoomSnapshot> rooms = new ArrayList<>();

    // Dates and guests
    private LocalDate checkIn;
    private LocalDate checkOut;
    private Integer guests;
    private Integer adults;

    @ElementCollection
    @CollectionTable(name = "booking_draft_child_ages", joinColumns = @JoinColumn(name = "draft_id"))
    @Column(name = "child_age")
    @OrderColumn(name = "child_order")
    @Builder.Default
    private List<Integer> childAges = new ArrayList<>();

    // Optional bus selections
    private Long outgoingTripId;
    private Long returnTripId;
    // Legacy single seat IDs (backward compatibility fallback)
    private Long outgoingSeatId;
    private Long returnSeatId;

    // Multi-seat snapshots
    @ElementCollection
    @CollectionTable(name = "booking_draft_going_seats", joinColumns = @JoinColumn(name = "draft_id"))
    @OrderColumn(name = "seat_order")
    @Builder.Default
    private List<DraftSeatSnapshot> goingSeats = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "booking_draft_return_seats", joinColumns = @JoinColumn(name = "draft_id"))
    @OrderColumn(name = "seat_order")
    @Builder.Default
    private List<DraftSeatSnapshot> returnSeats = new ArrayList<>();

    private Integer transportPassengers;

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

    // Draft status and source
    @Enumerated(EnumType.STRING)
    private DraftStatus status;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private DraftSource source = DraftSource.USER_SELECTED;

    // Expiry time (drafts expire after TTL from property)
    private LocalDateTime expiresAt;

    // Idempotency key for confirm endpoint
    private String idempotencyKey;

    // Confirmed booking ID (hotel booking ID)
    private Long confirmedBookingId;

    // Soft delete flag
    @Builder.Default
    private boolean deleted = false;

    public List<Long> getRoomIds() {
        if (rooms != null && !rooms.isEmpty()) {
            return rooms.stream().map(DraftRoomSnapshot::getRoomId).toList();
        }
        return roomId != null ? List.of(roomId) : Collections.emptyList();
    }

    public List<Long> getOutgoingSeatIds() {
        if (goingSeats != null && !goingSeats.isEmpty()) {
            return goingSeats.stream().map(DraftSeatSnapshot::getSeatId).toList();
        }
        return outgoingSeatId != null ? List.of(outgoingSeatId) : Collections.emptyList();
    }

    public List<Long> getReturnSeatIds() {
        if (returnSeats != null && !returnSeats.isEmpty()) {
            return returnSeats.stream().map(DraftSeatSnapshot::getSeatId).toList();
        }
        return returnSeatId != null ? List.of(returnSeatId) : Collections.emptyList();
    }
}
