package com.spring.boot.controller;

import com.spring.boot.dto.BusBookingDto;
import com.spring.boot.dto.BusBookingRequestDto;
import com.spring.boot.dto.StatusUpdateRequestDto;
import com.spring.boot.enums.BookingStatus;
import com.spring.boot.dto.UserDto;
import com.spring.boot.service.interfaces.BusBookingService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.AllArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
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
    public ResponseEntity<BusBookingDto> getBusBookingById(@PathVariable Long id) {
        BusBookingDto busBooking = busBookingService.getBusBookingById(id);
        return new ResponseEntity<>(busBooking, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<PagedModel<BusBookingDto>> getAllBusBookings(@ParameterObject Pageable pageable,
                                                                      @RequestParam(required = false) BookingStatus status,
                                                                      @RequestParam(required = false) String bookingDateAfter,
                                                                      @RequestParam(required = false) String bookingDateBefore,
                                                                      @RequestParam(required = false) Long userId,
                                                                      @RequestParam(required = false) Long busTripId,
                                                                      @RequestParam(required = false) Long seatId) {
        LocalDate parsedBookingDateAfter = bookingDateAfter != null && !bookingDateAfter.isEmpty()
                ? LocalDate.parse(bookingDateAfter)
                : null;
        LocalDate parsedBookingDateBefore = bookingDateBefore != null && !bookingDateBefore.isEmpty()
                ? LocalDate.parse(bookingDateBefore)
                : null;

        Page<BusBookingDto> busBookings = busBookingService.getAllBusBookings(pageable, status, parsedBookingDateAfter, parsedBookingDateBefore, userId, busTripId, seatId);
        return new ResponseEntity<>(new PagedModel<>(busBookings), HttpStatus.OK);
    }

    @GetMapping("/bus-trip/{busTripId}")
    public ResponseEntity<PagedModel<BusBookingDto>> getBusBookingsByBusTripId(@PathVariable Long busTripId,
                                                                              @ParameterObject Pageable pageable,
                                                                              @RequestParam(required = false) BookingStatus status,
                                                                              @RequestParam(required = false) String bookingDateAfter,
                                                                              @RequestParam(required = false) String bookingDateBefore,
                                                                              @RequestParam(required = false) Long userId) {
        LocalDate parsedBookingDateAfter = bookingDateAfter != null && !bookingDateAfter.isEmpty()
                ? LocalDate.parse(bookingDateAfter)
                : null;
        LocalDate parsedBookingDateBefore = bookingDateBefore != null && !bookingDateBefore.isEmpty()
                ? LocalDate.parse(bookingDateBefore)
                : null;

        Page<BusBookingDto> busBookings = busBookingService.getBusBookingsByBusTripId(busTripId, pageable, status, parsedBookingDateAfter, parsedBookingDateBefore, userId);
        return new ResponseEntity<>(new PagedModel<>(busBookings), HttpStatus.OK);
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
        UserDto userDto = (UserDto) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long userId = userDto.getId();
        List<BusBookingDto> busBookings = busBookingService.getMyBusBookings(userId);
        return new ResponseEntity<>(busBookings, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BusBookingDto> updateBusBooking(@PathVariable Long id, @RequestBody BusBookingRequestDto busBookingRequestDto) {
        BusBookingDto updatedBusBooking = busBookingService.updateBusBooking(id, busBookingRequestDto);
        return new ResponseEntity<>(updatedBusBooking, HttpStatus.OK);
    }

    @Operation(summary = "Update bus booking status", description = "Admin only. Validates allowed status transitions.")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BusBookingDto> updateBusBookingStatus(
            @PathVariable Long id,
            @RequestBody StatusUpdateRequestDto statusDto) {
        BusBookingDto updated = busBookingService.updateBookingStatus(id, statusDto.getStatus());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBusBooking(@PathVariable Long id) {
        busBookingService.deleteBusBooking(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}