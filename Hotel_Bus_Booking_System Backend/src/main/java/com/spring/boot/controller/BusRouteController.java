package com.spring.boot.controller;

import com.spring.boot.dto.BusRouteDto;
import com.spring.boot.dto.BusRouteRequestDto;
import com.spring.boot.service.interfaces.BusRouteService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;



/**
 * REST controller for BusRoute entity.
 */
@RestController
@RequestMapping("/api/bus-routes")
@AllArgsConstructor
public class BusRouteController {

    private final BusRouteService busRouteService;

    @PostMapping
    public ResponseEntity<BusRouteDto> createBusRoute(@RequestBody BusRouteRequestDto busRouteRequestDto) {
        BusRouteDto createdBusRoute = busRouteService.createBusRoute(busRouteRequestDto);
        return new ResponseEntity<>(createdBusRoute, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BusRouteDto> getBusRouteById(@PathVariable Long id) {
        BusRouteDto busRoute = busRouteService.getBusRouteById(id);
        return new ResponseEntity<>(busRoute, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<List<BusRouteDto>> getAllBusRoutes() {
        List<BusRouteDto> busRoutes = busRouteService.getAllBusRoutes();
        return new ResponseEntity<>(busRoutes, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BusRouteDto> updateBusRoute(@PathVariable Long id, @RequestBody BusRouteRequestDto busRouteRequestDto) {
        BusRouteDto updatedBusRoute = busRouteService.updateBusRoute(id, busRouteRequestDto);
        return new ResponseEntity<>(updatedBusRoute, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBusRoute(@PathVariable Long id) {
        busRouteService.deleteBusRoute(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}