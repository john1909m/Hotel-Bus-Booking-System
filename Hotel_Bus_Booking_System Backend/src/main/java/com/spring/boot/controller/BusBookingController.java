package com.spring.boot.controller;

import com.spring.boot.dto.BusBookingDto;
import com.spring.boot.dto.BusBookingRequestDto;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.spring.boot.service.interfaces.BusBookingService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for BusBooking entity.
 */
@RestController
@RequestMapping("/api/bus-bookings")
@AllArgsConstructor
public class BusBookingController {

    private final BusBookingService busBookingService;

    @PostMapping
    public ResponseEntity<BusBookingDto> createBusBooking( @RequestBody BusBookingRequestDto busBookingRequestDto) {
        BusBookingDto createdBusBooking = busBookingService.createBusBooking(busBookingRequestDto);
        return new ResponseEntity<>(createdBusBooking, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BusBookingDto> getBusBookingById(@PathVariable Long id) {
        BusBookingDto busBooking = busBookingService.getBusBookingById(id);
        return new ResponseEntity<>(busBooking, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<List<BusBookingDto>> getAllBusBookings() {
        List<BusBookingDto> busBookings = busBookingService.getAllBusBookings();
        return new ResponseEntity<>(busBookings, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<BusBookingDto>> getBusBookingsByUserId(@PathVariable Long userId) {
        List<BusBookingDto> busBookings = busBookingService.getBusBookingsByUserId(userId);
        return new ResponseEntity<>(busBookings, HttpStatus.OK);
    }

    @GetMapping("/bus-trip/{busTripId}")
    public ResponseEntity<List<BusBookingDto>> getBusBookingsByBusTripId(@PathVariable Long busTripId) {
        List<BusBookingDto> busBookings = busBookingService.getBusBookingsByBusTripId(busTripId);
        return new ResponseEntity<>(busBookings, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BusBookingDto> updateBusBooking(@PathVariable Long id,  @RequestBody BusBookingRequestDto busBookingRequestDto) {
        BusBookingDto updatedBusBooking = busBookingService.updateBusBooking(id, busBookingRequestDto);
        return new ResponseEntity<>(updatedBusBooking, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBusBooking(@PathVariable Long id) {
        busBookingService.deleteBusBooking(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}