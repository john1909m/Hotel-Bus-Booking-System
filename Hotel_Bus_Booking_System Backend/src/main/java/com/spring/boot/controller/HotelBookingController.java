package com.spring.boot.controller;

import com.spring.boot.dto.HotelBookingDto;
import com.spring.boot.dto.HotelBookingRequestDto;
import com.spring.boot.enums.BookingStatus;
import com.spring.boot.enums.Role;
import java.time.LocalDate;
import com.spring.boot.dto.UserDto;
import com.spring.boot.service.interfaces.HotelBookingService;
import lombok.AllArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
        // Extract user ID from authentication principal
        UserDto userDto = (UserDto) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long userId = userDto.getId();
        HotelBookingDto createdHotelBooking = hotelBookingService.createHotelBooking(hotelBookingRequestDto, userId);
        return new ResponseEntity<>(createdHotelBooking, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @hotelBookingSecurity.isOwner(#id, authentication)")
    public ResponseEntity<HotelBookingDto> getHotelBookingById(@PathVariable Long id) {
        HotelBookingDto hotelBooking = hotelBookingService.getHotelBookingById(id);
        return new ResponseEntity<>(hotelBooking, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<Page<HotelBookingDto>> getAllHotelBookings(@ParameterObject Pageable pageable,
                                                                     @RequestParam(required = false) BookingStatus status,
                                                                     @RequestParam(required = false) String checkInAfter,
                                                                     @RequestParam(required = false) String checkInBefore,
                                                                     @RequestParam(required = false) Long userId,
                                                                     @RequestParam(required = false) Long hotelId) {
        // Parse date strings if provided
        LocalDate parsedCheckInAfter = checkInAfter != null && !checkInAfter.isEmpty()
                ? LocalDate.parse(checkInAfter)
                : null;
        LocalDate parsedCheckInBefore = checkInBefore != null && !checkInBefore.isEmpty()
                ? LocalDate.parse(checkInBefore)
                : null;

        Page<HotelBookingDto> hotelBookings = hotelBookingService.getAllHotelBookingsPaginated(pageable, status, parsedCheckInAfter, parsedCheckInBefore, userId, hotelId);
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
    @PreAuthorize("hasRole('ADMIN') or @hotelBookingSecurity.isOwner(#id, authentication)")
    public ResponseEntity<HotelBookingDto> updateHotelBooking(@PathVariable Long id, @RequestBody HotelBookingRequestDto hotelBookingRequestDto) {
        HotelBookingDto updatedHotelBooking = hotelBookingService.updateHotelBooking(id, hotelBookingRequestDto);
        return new ResponseEntity<>(updatedHotelBooking, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @hotelBookingSecurity.isOwner(#id, authentication)")
    public ResponseEntity<Void> deleteHotelBooking(@PathVariable Long id) {
        hotelBookingService.deleteHotelBooking(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}