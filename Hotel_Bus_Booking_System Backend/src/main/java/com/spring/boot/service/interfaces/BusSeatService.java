package com.spring.boot.service.interfaces;

import com.spring.boot.dto.BusSeatDto;
import com.spring.boot.dto.BusSeatRequestDto;

import java.util.List;



/**
 * Service interface for BusSeat entity.
 */
public interface BusSeatService {

    BusSeatDto createBusSeat(BusSeatRequestDto busSeatRequestDto);

    BusSeatDto getBusSeatById(Long id);

    List<BusSeatDto> getAllBusSeats();

    List<BusSeatDto> getBusSeatsByBusId(Long busId);

    BusSeatDto updateBusSeat(Long id, BusSeatRequestDto busSeatRequestDto);

    void deleteBusSeat(Long id);
}