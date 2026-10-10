package com.spring.boot.controller;

import com.spring.boot.dto.RoomDto;
import com.spring.boot.dto.RoomRequestDto;
import com.spring.boot.enums.Role;

import com.spring.boot.service.interfaces.RoomService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for Room entity.
 */
@RestController
@RequestMapping("/api/rooms")
@AllArgsConstructor
public class RoomController {

    private final RoomService roomService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RoomDto> createRoom(@RequestBody RoomRequestDto roomRequestDto) {
        RoomDto createdRoom = roomService.createRoom(roomRequestDto);
        return new ResponseEntity<>(createdRoom, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RoomDto> getRoomById(@PathVariable Long id) {
        RoomDto room = roomService.getRoomById(id);
        return new ResponseEntity<>(room, HttpStatus.OK);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RoomDto>> getAllRooms() {
        List<RoomDto> rooms = roomService.getAllRooms();
        return new ResponseEntity<>(rooms, HttpStatus.OK);
    }

    @GetMapping("/hotel/{hotelId}")
    public ResponseEntity<List<RoomDto>> getRoomsByHotelId(@PathVariable Long hotelId) {
        List<RoomDto> rooms = roomService.getRoomsByHotelId(hotelId);
        return new ResponseEntity<>(rooms, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RoomDto> updateRoom(@PathVariable Long id,@RequestBody RoomRequestDto roomRequestDto) {
        RoomDto updatedRoom = roomService.updateRoom(id, roomRequestDto);
        return new ResponseEntity<>(updatedRoom, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteRoom(@PathVariable Long id) {
        roomService.deleteRoom(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}