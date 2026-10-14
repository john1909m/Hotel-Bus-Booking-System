package com.spring.boot.controller;

import com.spring.boot.dto.BusStopDto;
import com.spring.boot.dto.BusStopRequestDto;
import com.spring.boot.service.interfaces.BusStopService;
import lombok.AllArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BusStopDto> createBusStop(@RequestBody BusStopRequestDto busStopRequestDto) {
        BusStopDto createdBusStop = busStopService.createBusStop(busStopRequestDto);
        return new ResponseEntity<>(createdBusStop, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BusStopDto> getBusStopById(@PathVariable Long id) {
        BusStopDto busStop = busStopService.getBusStopById(id);
        return new ResponseEntity<>(busStop, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<Page<BusStopDto>> getAllBusStops(@ParameterObject Pageable pageable,
                                                           @RequestParam(required = false) String q,
                                                           @RequestParam(required = false) String city) {
        Page<BusStopDto> busStops = busStopService.getAllBusStopsPaginated(pageable, q, city);
        return new ResponseEntity<>(busStops, HttpStatus.OK);
    }

    @GetMapping("/lookup")
    public ResponseEntity<List<BusStopDto>> lookupBusStops(@ParameterObject Pageable pageable,
                                                           @RequestParam(required = false) String q) {
        // For lookup, we want to return a limited list based on the pageable size
        int lookupSize = Math.min(pageable.getPageSize(), 50); // cap at 50 for lookups
        Pageable lookupPageable = PageRequest.of(0, lookupSize, pageable.getSort());

        List<BusStopDto> busStops = busStopService.lookupBusStops(q, lookupPageable);
        return new ResponseEntity<>(busStops, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BusStopDto> updateBusStop(@PathVariable Long id, @RequestBody BusStopRequestDto busStopRequestDto) {
        BusStopDto updatedBusStop = busStopService.updateBusStop(id, busStopRequestDto);
        return new ResponseEntity<>(updatedBusStop, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteBusStop(@PathVariable Long id) {
        busStopService.deleteBusStop(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}