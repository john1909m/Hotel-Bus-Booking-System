package com.spring.boot.service.interfaces;

import com.spring.boot.dto.RoomDto;
import com.spring.boot.dto.RoomRequestDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * Service interface for Room entity.
 */
public interface RoomService {

    RoomDto createRoom(RoomRequestDto roomRequestDto);

    RoomDto getRoomById(Long id);

    List<RoomDto> getAllRooms();

    List<RoomDto> getRoomsByHotelId(Long hotelId);

    Page<RoomDto> getRoomsByHotelId(Long hotelId, Pageable pageable);

    RoomDto updateRoom(Long id, RoomRequestDto roomRequestDto);

    void deleteRoom(Long id);
}