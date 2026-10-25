package com.spring.boot.controller;

import com.spring.boot.dto.BusTripDto;
import com.spring.boot.dto.BusTripRequestDto;
import com.spring.boot.enums.BusTripStatus;
import com.spring.boot.service.interfaces.BusTripService;
import lombok.AllArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;


/**
 * REST controller for BusTrip entity.
 */
@RestController
@RequestMapping("/api/bus-trips")
@AllArgsConstructor
public class BusTripController {

    private final BusTripService busTripService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BusTripDto> createBusTrip(@RequestBody BusTripRequestDto busTripRequestDto) {
        BusTripDto createdBusTrip = busTripService.createBusTrip(busTripRequestDto);
        return new ResponseEntity<>(createdBusTrip, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BusTripDto> getBusTripById(@PathVariable Long id) {
        BusTripDto busTrip = busTripService.getBusTripById(id);
        return new ResponseEntity<>(busTrip, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<org.springframework.data.web.PagedModel<BusTripDto>> getAllBusTrips(@ParameterObject Pageable pageable,
                                                           @RequestParam(required = false) Long busId,
                                                           @RequestParam(required = false) Long routeId,
                                                           @RequestParam(required = false) BusTripStatus status,
                                                           @RequestParam(required = false) String departureAfter,
                                                           @RequestParam(required = false) String departureBefore) {
        // Parse date strings if provided
        LocalDateTime parsedDepartureAfter = departureAfter != null && !departureAfter.isEmpty()
                ? LocalDateTime.parse(departureAfter)
                : null;
        LocalDateTime parsedDepartureBefore = departureBefore != null && !departureBefore.isEmpty()
                ? LocalDateTime.parse(departureBefore)
                : null;

        Page<BusTripDto> busTrips = busTripService.getAllBusTripsPaginated(pageable, busId, routeId, status,
                                                                           parsedDepartureAfter, parsedDepartureBefore);
        return new ResponseEntity<>(new org.springframework.data.web.PagedModel<>(busTrips), HttpStatus.OK);
    }

    @GetMapping("/lookup")
    public ResponseEntity<List<BusTripDto>> lookupBusTrips(@ParameterObject Pageable pageable,
                                                           @RequestParam(required = false) String q) {
        // For lookup, we want to return a limited list based on the pageable size
        int lookupSize = Math.min(pageable.getPageSize(), 50); // cap at 50 for lookups
        Pageable lookupPageable = PageRequest.of(0, lookupSize, pageable.getSort());

        List<BusTripDto> busTrips = busTripService.lookupBusTrips(q, lookupPageable);
        return new ResponseEntity<>(busTrips, HttpStatus.OK);
    }

    @GetMapping("/bus/{busId}")
    public ResponseEntity<List<BusTripDto>> getBusTripsByBusId(@PathVariable Long busId) {
        List<BusTripDto> busTrips = busTripService.getBusTripsByBusId(busId);
        return new ResponseEntity<>(busTrips, HttpStatus.OK);
    }

    @GetMapping("/route/{routeId}")
    public ResponseEntity<List<BusTripDto>> getBusTripsByRouteId(@PathVariable Long routeId) {
        List<BusTripDto> busTrips = busTripService.getBusTripsByRouteId(routeId);
        return new ResponseEntity<>(busTrips, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BusTripDto> updateBusTrip(@PathVariable Long id, @RequestBody BusTripRequestDto busTripRequestDto) {
        BusTripDto updatedBusTrip = busTripService.updateBusTrip(id, busTripRequestDto);
        return new ResponseEntity<>(updatedBusTrip, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteBusTrip(@PathVariable Long id) {
        busTripService.deleteBusTrip(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}