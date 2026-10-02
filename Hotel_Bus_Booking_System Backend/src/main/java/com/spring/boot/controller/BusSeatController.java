package com.spring.boot.controller;

import com.spring.boot.dto.BusSeatDto;
import com.spring.boot.dto.BusSeatRequestDto;
import com.spring.boot.service.interfaces.BusSeatService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

//interface.BusSeatService;

/**
 * REST controller for BusSeat entity.
 */
@RestController
@RequestMapping("/api/bus-seats")
@AllArgsConstructor
public class BusSeatController {

    private final BusSeatService busSeatService;

    @PostMapping
    public ResponseEntity<BusSeatDto> createBusSeat(@RequestBody BusSeatRequestDto busSeatRequestDto) {
        BusSeatDto createdBusSeat = busSeatService.createBusSeat(busSeatRequestDto);
        return new ResponseEntity<>(createdBusSeat, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BusSeatDto> getBusSeatById(@PathVariable Long id) {
        BusSeatDto busSeat = busSeatService.getBusSeatById(id);
        return new ResponseEntity<>(busSeat, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<List<BusSeatDto>> getAllBusSeats() {
        List<BusSeatDto> busSeats = busSeatService.getAllBusSeats();
        return new ResponseEntity<>(busSeats, HttpStatus.OK);
    }

    @GetMapping("/bus/{busId}")
    public ResponseEntity<List<BusSeatDto>> getBusSeatsByBusId(@PathVariable Long busId) {
        List<BusSeatDto> busSeats = busSeatService.getBusSeatsByBusId(busId);
        return new ResponseEntity<>(busSeats, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BusSeatDto> updateBusSeat(@PathVariable Long id, @RequestBody BusSeatRequestDto busSeatRequestDto) {
        BusSeatDto updatedBusSeat = busSeatService.updateBusSeat(id, busSeatRequestDto);
        return new ResponseEntity<>(updatedBusSeat, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
public ResponseEntity<Void> deleteBusSeat(@PathVariable Long id) {
    busSeatService.deleteBusSeat(id);
    return new ResponseEntity<>(HttpStatus.NO_CONTENT);
}
}