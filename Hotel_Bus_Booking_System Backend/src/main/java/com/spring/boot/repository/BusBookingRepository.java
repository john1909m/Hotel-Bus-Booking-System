package com.spring.boot.repository;

import com.spring.boot.enums.BookingStatus;
import com.spring.boot.model.BusBooking;
import com.spring.boot.repository.spec.BusBookingSpecs;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;


/**
 * Spring Data JPA repository for BusBooking entity.
 */
@Repository
public interface BusBookingRepository extends JpaRepository<BusBooking, Long> {
    List<BookingStatus> ACTIVE_STATUSES = List.of(BookingStatus.CONFIRMED, BookingStatus.PENDING);

    List<BusBooking> findByUser_Id(Long userId);

    List<BusBooking> findByBusTripId(Long busTripId);

    List<BusBooking> findByBusTripIdAndSeatIdAndStatusIn(
            Long busTripId, Long seatId, List<BookingStatus> statuses);

    List<BusBooking> findByBusTripIdAndSeatIdAndStatusInAndIdNot(
            Long busTripId, Long seatId, List<BookingStatus> statuses, Long bookingId);

    Page<BusBooking> findByStatus(BookingStatus status, Pageable pageable);

    Page<BusBooking> findByBookingDateAfter(LocalDate bookingDateAfter, Pageable pageable);

    Page<BusBooking> findByBookingDateBefore(LocalDate bookingDateBefore, Pageable pageable);

    Page<BusBooking> findBySeatId(Long seatId, Pageable pageable);

    @Query("""
            SELECT bb.seat.id
            FROM BusBooking bb
            WHERE bb.busTrip.id = :tripId
              AND bb.status IN :statuses
            """)
    List<Long> findBookedSeatIdsByTripId(@Param("tripId") Long tripId,
                                         @Param("statuses") List<BookingStatus> statuses);

    /** Same name/signature the service already calls. */
    default List<Long> findBookedSeatIdsByTripId(Long tripId) {
        return findBookedSeatIdsByTripId(tripId, ACTIVE_STATUSES);
    }

    /** All optional filters, built with a Specification (safe with null values on PostgreSQL). */
    default Page<BusBooking> findByFilters(BookingStatus status,
                                           LocalDate bookingDateAfter,
                                           LocalDate bookingDateBefore,
                                           Long userId,
                                           Long busTripId,
                                           Long seatId,
                                           Pageable pageable) {
        return findAll(BusBookingSpecs.filter(status, bookingDateAfter, bookingDateBefore,
                userId, busTripId, seatId), pageable);
    }

    Page<BusBooking> findAll(Specification<BusBooking> filter, Pageable pageable);

    /** Same call without seatId (the second signature in your errors). */
    default Page<BusBooking> findByFilters(BookingStatus status,
                                           LocalDate bookingDateAfter,
                                           LocalDate bookingDateBefore,
                                           Long userId,
                                           Long busTripId,
                                           Pageable pageable) {
        return findByFilters(status, bookingDateAfter, bookingDateBefore, userId, busTripId, null, pageable);
    }
}