package com.spring.boot.repository;

import com.spring.boot.enums.BookingStatus;
import com.spring.boot.model.BusBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for BusBooking entity.
 */
@Repository
public interface BusBookingRepository extends JpaRepository<BusBooking, Long> {

    List<BusBooking> findByUser_Id(Long userId);

    List<BusBooking> findByBusTripId(Long busTripId);

    List<BusBooking> findByBusTripIdAndSeatIdAndStatusIn(Long busTripId, Long seatId, List<String> statuses);

    List<BusBooking> findByBusTripIdAndSeatIdAndStatusInAndIdNot(Long busTripId, Long seatId, List<String> statuses, Long bookingId);
    @Query("""
            select bb.seat.id
            from BusBooking bb
            where bb.busTrip.id = :tripId
            and bb.status in ('CONFIRMED', 'PENDING')
            """)
    List<Long> findBookedSeatIdsByTripId(@Param("tripId") Long tripId);
}