package com.spring.boot.repository;

import com.spring.boot.model.HotelBooking;
import com.spring.boot.enums.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

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

    List<HotelBooking> findByUser_Id(Long userId);

    List<HotelBooking> findByUser_IdAndUser_name(Long userId,String name);

    List<HotelBooking> findByHotelId(Long hotelId);

    @Query(value = """
                SELECT DISTINCT hb FROM HotelBooking hb
                WHERE (:status = 'ANY' OR hb.status = :status)
                  AND (hb.checkIn >= COALESCE(:checkInAfter, hb.checkIn))
                  AND (hb.checkIn <= COALESCE(:checkInBefore, hb.checkIn))
                  AND (:userId = 0 OR hb.user.id = :userId)
                  AND (:hotelId = 0 OR hb.hotel.id = :hotelId)
            """,
    countQuery = "SELECT COUNT(DISTINCT hb) FROM HotelBooking hb WHERE (:status = 'ANY' OR hb.status = :status) AND (hb.checkIn >= COALESCE(:checkInAfter, hb.checkIn)) AND (hb.checkIn <= COALESCE(:checkInBefore, hb.checkIn)) AND (:userId = 0 OR hb.user.id = :userId) AND (:hotelId = 0 OR hb.hotel.id = :hotelId)"
    )
    Page<HotelBooking> findByFilters(@Param("status") BookingStatus status,
                                     @Param("checkInAfter") LocalDate checkInAfter,
                                     @Param("checkInBefore") LocalDate checkInBefore,
                                     @Param("userId") Long userId,
                                     @Param("hotelId") Long hotelId,
                                     Pageable pageable);
}