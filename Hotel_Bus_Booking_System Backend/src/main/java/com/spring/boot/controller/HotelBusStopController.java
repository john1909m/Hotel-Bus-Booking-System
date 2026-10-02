package com.spring.boot.controller;

import com.spring.boot.dto.HotelBusStopDto;
import com.spring.boot.dto.HotelBusStopRequestDto;

import com.spring.boot.service.interfaces.HotelBusStopService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

//import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import java.util.List;




/**
 * REST controller for HotelBusStop entity.
 */
@RestController
@RequestMapping("/api/hotel-bus-stops")
@AllArgsConstructor
public class HotelBusStopController {

    private final HotelBusStopService hotelBusStopService;

    @PostMapping
    public ResponseEntity<HotelBusStopDto> createHotelBusStop( @RequestBody HotelBusStopRequestDto hotelBusStopRequestDto) {
        HotelBusStopDto createdHotelBusStop = hotelBusStopService.createHotelBusStop(hotelBusStopRequestDto);
        return new ResponseEntity<>(createdHotelBusStop, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<HotelBusStopDto> getHotelBusStopById(@PathVariable Long id) {
        HotelBusStopDto hotelBusStop = hotelBusStopService.getHotelBusStopById(id);
        return new ResponseEntity<>(hotelBusStop, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<List<HotelBusStopDto>> getAllHotelBusStops() {
        List<HotelBusStopDto> hotelBusStops = hotelBusStopService.getAllHotelBusStops();
        return new ResponseEntity<>(hotelBusStops, HttpStatus.OK);
    }

    @GetMapping("/hotel/{hotelId}")
    public ResponseEntity<List<HotelBusStopDto>> getHotelBusStopsByHotelId(@PathVariable Long hotelId) {
        List<HotelBusStopDto> hotelBusStops = hotelBusStopService.getHotelBusStopsByHotelId(hotelId);
        return new ResponseEntity<>(hotelBusStops, HttpStatus.OK);
    }

    @GetMapping("/bus-stop/{busStopId}")
    public ResponseEntity<List<HotelBusStopDto>> getHotelBusStopsByBusStopId(@PathVariable Long busStopId) {
        List<HotelBusStopDto> hotelBusStops = hotelBusStopService.getHotelBusStopsByBusStopId(busStopId);
        return new ResponseEntity<>(hotelBusStops, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    public ResponseEntity<HotelBusStopDto> updateHotelBusStop(@PathVariable Long id, @RequestBody HotelBusStopRequestDto hotelBusStopRequestDto) {
        HotelBusStopDto updatedHotelBusStop = hotelBusStopService.updateHotelBusStop(id, hotelBusStopRequestDto);
        return new ResponseEntity<>(updatedHotelBusStop, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteHotelBusStop(@PathVariable Long id) {
        hotelBusStopService.deleteHotelBusStop(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}