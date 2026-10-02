package com.spring.boot.service.interfaces;
import com.spring.boot.dto.BusDto;
import com.spring.boot.dto.BusRequestDto;

import java.util.List;



/**
 * Service interface for Bus entity.
 */
public interface BusService {

    BusDto createBus(BusRequestDto busRequestDto);

    BusDto getBusById(Long id);

    List<BusDto> getAllBuses();

    BusDto updateBus(Long id, BusRequestDto busRequestDto);

    void deleteBus(Long id);
}