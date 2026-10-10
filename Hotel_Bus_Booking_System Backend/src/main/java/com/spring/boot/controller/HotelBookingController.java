package com.spring.boot.controller;

import com.spring.boot.dto.HotelBookingDto;
import com.spring.boot.dto.HotelBookingRequestDto;
import com.spring.boot.enums.Role;
//import com.spring.boot.security.jwt.TokenHandler;
import com.spring.boot.dto.UserDto;

import com.spring.boot.service.interfaces.HotelBookingService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for HotelBooking entity.
 */
@RestController
@RequestMapping("/api/hotel-bookings")
@AllArgsConstructor
public class HotelBookingController {

    private final HotelBookingService hotelBookingService;

    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<HotelBookingDto> createHotelBooking(@RequestBody HotelBookingRequestDto hotelBookingRequestDto) {
        HotelBookingDto createdHotelBooking = hotelBookingService.createHotelBooking(hotelBookingRequestDto);
        return new ResponseEntity<>(createdHotelBooking, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @PreAuthorize("#hotelBookingService.getHotelBookingById(#id).getCostumer().getId() == authentication.principal.id or hasRole('ADMIN')")
    public ResponseEntity<HotelBookingDto> getHotelBookingById(@PathVariable Long id) {
        HotelBookingDto hotelBooking = hotelBookingService.getHotelBookingById(id);
        return new ResponseEntity<>(hotelBooking, HttpStatus.OK);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<HotelBookingDto>> getAllHotelBookings() {
        List<HotelBookingDto> hotelBookings = hotelBookingService.getAllHotelBookings();
        return new ResponseEntity<>(hotelBookings, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("#userId == authentication.principal.id or hasRole('ADMIN')")
    public ResponseEntity<List<HotelBookingDto>> getHotelBookingsByUserId(@PathVariable Long userId) {
        List<HotelBookingDto> hotelBookings = hotelBookingService.getHotelBookingsByUserId(userId);
        return new ResponseEntity<>(hotelBookings, HttpStatus.OK);
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<HotelBookingDto>> getMyHotelBookings() {
        // Extract user ID from authentication principal
        UserDto userDto = (UserDto) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long userId = userDto.getId();
        List<HotelBookingDto> hotelBookings = hotelBookingService.getMyHotelBookings(userId);
        return new ResponseEntity<>(hotelBookings, HttpStatus.OK);
    }

    @GetMapping("/hotel/{hotelId}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<List<HotelBookingDto>> getHotelBookingsByHotelId(@PathVariable Long hotelId) {
        List<HotelBookingDto> hotelBookings = hotelBookingService.getHotelBookingsByHotelId(hotelId);
        return new ResponseEntity<>(hotelBookings, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    @PreAuthorize("#hotelBookingService.getHotelBookingById(#id).getCostumer().getId() == authentication.principal.id or hasRole('ADMIN')")
    public ResponseEntity<HotelBookingDto> updateHotelBooking(@PathVariable Long id, @RequestBody HotelBookingRequestDto hotelBookingRequestDto) {
        HotelBookingDto updatedHotelBooking = hotelBookingService.updateHotelBooking(id, hotelBookingRequestDto);
        return new ResponseEntity<>(updatedHotelBooking, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("#hotelBookingService.getHotelBookingById(#id).getCostumer().getId() == authentication.principal.id or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteHotelBooking(@PathVariable Long id) {
        hotelBookingService.deleteHotelBooking(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}