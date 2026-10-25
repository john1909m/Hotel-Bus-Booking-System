package com.spring.boot.repository;

import com.spring.boot.model.HotelBookingRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for HotelBookingRoom entity.
 */
@Repository
public interface HotelBookingRoomRepository extends JpaRepository<HotelBookingRoom, Long> {

    List<HotelBookingRoom> findByHotelBookingId(Long hotelBookingId);

    List<HotelBookingRoom> findByRoomId(Long roomId);

    boolean existsByRoomId(Long roomId);
}
