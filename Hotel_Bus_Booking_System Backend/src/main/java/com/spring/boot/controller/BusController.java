package com.spring.boot.controller;

import com.spring.boot.dto.BusDto;
import com.spring.boot.dto.BusRequestDto;
import com.spring.boot.service.interfaces.BusService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;



            /**
             * REST controller for Bus entity.
             */
@RestController
@RequestMapping("/api/buses")
@AllArgsConstructor
public class BusController {

    private final BusService busService;

    @PostMapping
    public ResponseEntity<BusDto> createBus( @RequestBody BusRequestDto busRequestDto) {
        BusDto createdBus = busService.createBus(busRequestDto);
        return new ResponseEntity<>(createdBus, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BusDto> getBusById(@PathVariable Long id) {
        BusDto bus = busService.getBusById(id);
        return new ResponseEntity<>(bus, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<List<BusDto>> getAllBuses() {
        List<BusDto> buses = busService.getAllBuses();
        return new ResponseEntity<>(buses, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BusDto> updateBus(@PathVariable Long id, @RequestBody BusRequestDto busRequestDto) {
        BusDto updatedBus = busService.updateBus(id, busRequestDto);
        return new ResponseEntity<>(updatedBus, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
public ResponseEntity<Void> deleteBus(@PathVariable Long id) {
    busService.deleteBus(id);
    return new ResponseEntity<>(HttpStatus.NO_CONTENT);
}
}