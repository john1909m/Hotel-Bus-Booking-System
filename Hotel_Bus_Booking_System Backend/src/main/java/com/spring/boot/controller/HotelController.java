package com.spring.boot.controller;

import com.spring.boot.dto.HotelDto;
import com.spring.boot.dto.HotelRequestDto;
import com.spring.boot.dto.RoomDto;
import com.spring.boot.service.interfaces.HotelService;
import com.spring.boot.service.interfaces.RoomService;
import lombok.AllArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for Hotel entity.
 */
@RestController
@RequestMapping("/api/hotels")
@AllArgsConstructor
public class HotelController {

    private final HotelService hotelService;
    private final RoomService roomService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<HotelDto> createHotel(@RequestBody HotelRequestDto hotelRequestDto) {
        HotelDto createdHotel = hotelService.createHotel(hotelRequestDto);
        return new ResponseEntity<>(createdHotel, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<HotelDto> getHotelById(@PathVariable Long id) {
        HotelDto hotel = hotelService.getHotelById(id);
        return new ResponseEntity<>(hotel, HttpStatus.OK);
    }

    @GetMapping("/{id}/rooms")
    public ResponseEntity<PagedModel<RoomDto>> getRooms(
            @PathVariable Long id,
            @ParameterObject Pageable pageable) {
        return ResponseEntity.ok(new PagedModel<>(roomService.getRoomsByHotelId(id, pageable)));
    }

    @GetMapping
    public ResponseEntity<PagedModel<HotelDto>> getAllHotels(@ParameterObject Pageable pageable,
                                                             @RequestParam(required = false) String q,
                                                             @RequestParam(required = false) String city,
                                                             @RequestParam(required = false) Double minRating,
                                                             @RequestParam(required = false) Double maxPrice) {
        Page<HotelDto> hotels = hotelService.getAllHotelsPaginated(pageable, q, city, minRating, maxPrice);
        return new ResponseEntity<>(new PagedModel<>(hotels), HttpStatus.OK);
    }


    @GetMapping("/lookup")
    public ResponseEntity<List<HotelDto>> lookupHotels(@ParameterObject Pageable pageable,
                                                       @RequestParam(required = false) String q) {
        // For lookup, we want to return a limited list based on the pageable size
        int lookupSize = Math.min(pageable.getPageSize(), 50); // cap at 50 for lookups
        Pageable lookupPageable = PageRequest.of(0, lookupSize, pageable.getSort());

        List<HotelDto> hotels = hotelService.lookupHotels(q, lookupPageable);
        return new ResponseEntity<>(hotels, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<HotelDto> updateHotel(@PathVariable Long id, @RequestBody HotelRequestDto hotelRequestDto) {
        HotelDto updatedHotel = hotelService.updateHotel(id, hotelRequestDto);
        return new ResponseEntity<>(updatedHotel, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteHotel(@PathVariable Long id) {
        hotelService.deleteHotel(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}