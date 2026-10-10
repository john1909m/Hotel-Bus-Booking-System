package com.spring.boot.repository;

import com.spring.boot.model.HotelBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Spring Data JPA repository for HotelBooking entity.
 */
@Repository
public interface HotelBookingRepository extends JpaRepository<HotelBooking, Long> {

    @Query("SELECT hb FROM HotelBooking hb WHERE hb.room.id = ?1 AND " +
            "((hb.checkIn >= ?2 AND hb.checkIn < ?3) OR " +  // Existing booking starts during new booking
            "(hb.checkOut > ?2 AND hb.checkOut <= ?3) OR " +  // Existing booking ends during new booking
            "(hb.checkIn <= ?2 AND hb.checkOut >= ?3)) AND " +  // Existing booking encompasses new booking
            "hb.status IN ('CONFIRMED', 'PENDING')")
    List<HotelBooking> findOverlappingBookings(Long roomId, LocalDate checkIn, LocalDate checkOut);

    @Query("SELECT hb FROM HotelBooking hb WHERE hb.room.id = ?1 AND " +
            "((hb.checkIn >= ?2 AND hb.checkIn < ?3) OR " +  // Existing booking starts during new booking
            "(hb.checkOut > ?2 AND hb.checkOut <= ?3) OR " +  // Existing booking ends during new booking
            "(hb.checkIn <= ?2 AND hb.checkOut >= ?3)) AND " +  // Existing booking encompasses new booking
            "hb.status IN ('CONFIRMED', 'PENDING') AND hb.id != ?4")
    List<HotelBooking> findOverlappingBookingsExcludingSelf(Long roomId, LocalDate checkIn, LocalDate checkOut, Long bookingId);

    List<HotelBooking> findByCostumer_Id(Long userId);

    List<HotelBooking> findByHotelId(Long hotelId);
}