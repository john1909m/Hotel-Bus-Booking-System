package com.spring.boot.service.impl;

import com.spring.boot.dto.RoomDto;
import com.spring.boot.dto.RoomRequestDto;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.Room;
import com.spring.boot.mapper.RoomMapper;
import com.spring.boot.repository.RoomRepository;
//import com.spring.boot.service.
import com.spring.boot.service.interfaces.RoomService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

//interface.RoomService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Service implementation for Room entity.
 */
@Service
@AllArgsConstructor
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;
    private final RoomMapper roomMapper;
    private final BundleMessageService bundleMessageService;

    @Override
    public RoomDto createRoom(RoomRequestDto roomRequestDto) {
        Room room = roomMapper.roomRequestDtoToRoom(roomRequestDto);
        Room savedRoom = roomRepository.save(room);
        return roomMapper.roomToRoomDto(savedRoom);
    }

    @Override
    public RoomDto getRoomById(Long id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_found")));
        return roomMapper.roomToRoomDto(room);
    }

    @Override
    public java.util.List<RoomDto> getAllRooms() {
        return roomRepository.findAll().stream()
                .map(roomMapper::roomToRoomDto)
                .toList();
    }

    @Override
    public java.util.List<RoomDto> getRoomsByHotelId(Long hotelId) {
        return roomRepository.findByHotelId(hotelId).stream()
                .map(roomMapper::roomToRoomDto)
                .toList();
    }

    @Override
    public RoomDto updateRoom(Long id, RoomRequestDto roomRequestDto) {
        Room existingRoom = roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_found")));

        // Update fields
        existingRoom.setRoomNumber(roomRequestDto.getRoomNumber());
        existingRoom.setRoomType(roomRequestDto.getRoomType());
        existingRoom.setCapacity(roomRequestDto.getCapacity());
        existingRoom.setPricePerNight(roomRequestDto.getPricePerNight());

        // Save room
        Room updatedRoom = roomRepository.save(existingRoom);

        // Return DTO
        return roomMapper.roomToRoomDto(updatedRoom);
    }

    @Override
    public void deleteRoom(Long id) {
        if (!roomRepository.existsById(id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_found"));
        }
        roomRepository.deleteById(id);
    }
}