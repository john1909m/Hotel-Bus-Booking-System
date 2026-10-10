package com.spring.boot.controller;

import com.spring.boot.dto.BusBookingDto;
import com.spring.boot.dto.BusBookingRequestDto;
import com.spring.boot.enums.Role;
//import com.spring.boot.security.jwt.TokenHandler;
import com.spring.boot.dto.UserDto;

import com.spring.boot.service.interfaces.BusBookingService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<BusBookingDto> createBusBooking(@RequestBody BusBookingRequestDto busBookingRequestDto) {
        BusBookingDto createdBusBooking = busBookingService.createBusBooking(busBookingRequestDto);
        return new ResponseEntity<>(createdBusBooking, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @PreAuthorize("#busBookingService.getBusBookingById(#id).getCostumer().getId() == authentication.principal.id or hasRole('ADMIN')")
    public ResponseEntity<BusBookingDto> getBusBookingById(@PathVariable Long id) {
        BusBookingDto busBooking = busBookingService.getBusBookingById(id);
        return new ResponseEntity<>(busBooking, HttpStatus.OK);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<BusBookingDto>> getAllBusBookings() {
        List<BusBookingDto> busBookings = busBookingService.getAllBusBookings();
        return new ResponseEntity<>(busBookings, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("#userId == authentication.principal.id or hasRole('ADMIN')")
    public ResponseEntity<List<BusBookingDto>> getBusBookingsByUserId(@PathVariable Long userId) {
        List<BusBookingDto> busBookings = busBookingService.getBusBookingsByUserId(userId);
        return new ResponseEntity<>(busBookings, HttpStatus.OK);
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<BusBookingDto>> getMyBusBookings() {
        // Extract user ID from authentication principal
        UserDto userDto = (UserDto) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long userId = userDto.getId();
        List<BusBookingDto> busBookings = busBookingService.getMyBusBookings(userId);
        return new ResponseEntity<>(busBookings, HttpStatus.OK);
    }

    @GetMapping("/bus-trip/{busTripId}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<List<BusBookingDto>> getBusBookingsByBusTripId(@PathVariable Long busTripId) {
        List<BusBookingDto> busBookings = busBookingService.getBusBookingsByBusTripId(busTripId);
        return new ResponseEntity<>(busBookings, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    @PreAuthorize("#busBookingService.getBusBookingById(#id).getCostumer().getId() == authentication.principal.id or hasRole('ADMIN')")
    public ResponseEntity<BusBookingDto> updateBusBooking(@PathVariable Long id, @RequestBody BusBookingRequestDto busBookingRequestDto) {
        BusBookingDto updatedBusBooking = busBookingService.updateBusBooking(id, busBookingRequestDto);
        return new ResponseEntity<>(updatedBusBooking, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("#busBookingService.getBusBookingById(#id).getCostumer().getId() == authentication.principal.id or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteBusBooking(@PathVariable Long id) {
        busBookingService.deleteBusBooking(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}