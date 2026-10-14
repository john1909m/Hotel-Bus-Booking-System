package com.spring.boot.controller;

import com.spring.boot.dto.BusDto;
import com.spring.boot.dto.BusRequestDto;
//import com.spring.boot.enums.BusType;
import com.spring.boot.service.interfaces.BusService;
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
 * REST controller for Bus entity.
 */
@RestController
@RequestMapping("/api/buses")
@AllArgsConstructor
public class BusController {

    private final BusService busService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BusDto> createBus(@RequestBody BusRequestDto busRequestDto) {
        BusDto createdBus = busService.createBus(busRequestDto);
        return new ResponseEntity<>(createdBus, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BusDto> getBusById(@PathVariable Long id) {
        BusDto bus = busService.getBusById(id);
        return new ResponseEntity<>(bus, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<Page<BusDto>> getAllBuses(@ParameterObject Pageable pageable,
                                                    @RequestParam(required = false) String q,
                                                    @RequestParam(required = false) String busType,
                                                    @RequestParam(required = false) String company) {
        Page<BusDto> buses = busService.getAllBusesPaginated(pageable, q, busType, company);
        return new ResponseEntity<>(buses, HttpStatus.OK);
    }

    @GetMapping("/lookup")
    public ResponseEntity<List<BusDto>> lookupBuses(@ParameterObject Pageable pageable,
                                                    @RequestParam(required = false) String q) {
        // For lookup, we want to return a limited list based on the pageable size
        int lookupSize = Math.min(pageable.getPageSize(), 50); // cap at 50 for lookups
        Pageable lookupPageable = PageRequest.of(0, lookupSize, pageable.getSort());

        List<BusDto> buses = busService.lookupBuses(q, lookupPageable);
        return new ResponseEntity<>(buses, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BusDto> updateBus(@PathVariable Long id, @RequestBody BusRequestDto busRequestDto) {
        BusDto updatedBus = busService.updateBus(id, busRequestDto);
        return new ResponseEntity<>(updatedBus, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteBus(@PathVariable Long id) {
        busService.deleteBus(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}