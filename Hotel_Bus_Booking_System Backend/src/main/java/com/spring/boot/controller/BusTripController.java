package com.spring.boot.controller;

import com.spring.boot.dto.BusTripDto;
import com.spring.boot.dto.BusTripRequestDto;

import com.spring.boot.service.interfaces.BusTripService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<List<BusTripDto>> getAllBusTrips() {
        List<BusTripDto> busTrips = busTripService.getAllBusTrips();
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
    public ResponseEntity<BusTripDto> updateBusTrip(@PathVariable Long id, @RequestBody BusTripRequestDto busTripRequestDto) {
        BusTripDto updatedBusTrip = busTripService.updateBusTrip(id, busTripRequestDto);
        return new ResponseEntity<>(updatedBusTrip, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBusTrip(@PathVariable Long id) {
        busTripService.deleteBusTrip(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}