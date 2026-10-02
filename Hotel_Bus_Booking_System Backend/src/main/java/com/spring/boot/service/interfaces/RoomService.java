package com.spring.boot.service.interfaces;

import com.spring.boot.dto.RoomDto;
import com.spring.boot.dto.RoomRequestDto;

import java.util.List;

/**
 * Service interface for Room entity.
 */
public interface RoomService {

    RoomDto createRoom(RoomRequestDto roomRequestDto);

    RoomDto getRoomById(Long id);

    List<RoomDto> getAllRooms();

    List<RoomDto> getRoomsByHotelId(Long hotelId);

    RoomDto updateRoom(Long id, RoomRequestDto roomRequestDto);

    void deleteRoom(Long id);
}