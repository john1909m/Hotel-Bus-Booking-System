package com.spring.boot.controller;

import com.spring.boot.dto.HotelBookingDto;
import com.spring.boot.dto.HotelBookingRequestDto;

import com.spring.boot.service.interfaces.HotelBookingService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<HotelBookingDto> createHotelBooking(@RequestBody HotelBookingRequestDto hotelBookingRequestDto) {
        HotelBookingDto createdHotelBooking = hotelBookingService.createHotelBooking(hotelBookingRequestDto);
        return new ResponseEntity<>(createdHotelBooking, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<HotelBookingDto> getHotelBookingById(@PathVariable Long id) {
        HotelBookingDto hotelBooking = hotelBookingService.getHotelBookingById(id);
        return new ResponseEntity<>(hotelBooking, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<List<HotelBookingDto>> getAllHotelBookings() {
        List<HotelBookingDto> hotelBookings = hotelBookingService.getAllHotelBookings();
        return new ResponseEntity<>(hotelBookings, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<HotelBookingDto>> getHotelBookingsByUserId(@PathVariable Long userId) {
        List<HotelBookingDto> hotelBookings = hotelBookingService.getHotelBookingsByUserId(userId);
        return new ResponseEntity<>(hotelBookings, HttpStatus.OK);
    }

    @GetMapping("/hotel/{hotelId}")
    public ResponseEntity<List<HotelBookingDto>> getHotelBookingsByHotelId(@PathVariable Long hotelId) {
        List<HotelBookingDto> hotelBookings = hotelBookingService.getHotelBookingsByHotelId(hotelId);
        return new ResponseEntity<>(hotelBookings, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    public ResponseEntity<HotelBookingDto> updateHotelBooking(@PathVariable Long id, @RequestBody HotelBookingRequestDto hotelBookingRequestDto) {
        HotelBookingDto updatedHotelBooking = hotelBookingService.updateHotelBooking(id, hotelBookingRequestDto);
        return new ResponseEntity<>(updatedHotelBooking, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteHotelBooking(@PathVariable Long id) {
        hotelBookingService.deleteHotelBooking(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}