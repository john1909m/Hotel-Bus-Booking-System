package com.spring.boot.controller;

import com.spring.boot.dto.BusStopDto;
import com.spring.boot.dto.BusStopRequestDto;
import com.spring.boot.service.interfaces.BusStopService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;



/**
 * REST controller for BusStop entity.
 */
@RestController
@RequestMapping("/api/bus-stops")
@AllArgsConstructor
public class BusStopController {

    private final BusStopService busStopService;

    @PostMapping
    public ResponseEntity<BusStopDto> createBusStop( @RequestBody BusStopRequestDto busStopRequestDto) {
        BusStopDto createdBusStop = busStopService.createBusStop(busStopRequestDto);
        return new ResponseEntity<>(createdBusStop, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BusStopDto> getBusStopById(@PathVariable Long id) {
        BusStopDto busStop = busStopService.getBusStopById(id);
        return new ResponseEntity<>(busStop, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<List<BusStopDto>> getAllBusStops() {
        List<BusStopDto> busStops = busStopService.getAllBusStops();
        return new ResponseEntity<>(busStops, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BusStopDto> updateBusStop(@PathVariable Long id, @RequestBody BusStopRequestDto busStopRequestDto) {
        BusStopDto updatedBusStop = busStopService.updateBusStop(id, busStopRequestDto);
        return new ResponseEntity<>(updatedBusStop, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
public ResponseEntity<Void> deleteBusStop(@PathVariable Long id) {
    busStopService.deleteBusStop(id);
    return new ResponseEntity<>(HttpStatus.NO_CONTENT);
}
}