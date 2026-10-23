package com.spring.boot.repository;

import com.spring.boot.enums.RoomType;
import com.spring.boot.model.Room;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for Room entity.
 */
@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {

    List<Room> findByHotelId(Long hotelId);

    Page<Room> findByHotelId(Long hotelId, Pageable pageable);

    boolean existsByHotelIdAndRoomType(Long hotelId, RoomType roomType);
}