package com.spring.boot.service.interfaces;

import com.spring.boot.dto.BusStopDto;
import com.spring.boot.dto.BusStopRequestDto;



import com.spring.boot.dto.BusStopDto;
import com.spring.boot.dto.BusStopRequestDto;

/**
 * Service interface for BusStop entity.
 */
public interface BusStopService {

    BusStopDto createBusStop(BusStopRequestDto busStopRequestDto);

    BusStopDto getBusStopById(Long id);

    java.util.List<BusStopDto> getAllBusStops();

    BusStopDto updateBusStop(Long id, BusStopRequestDto busStopRequestDto);

    void deleteBusStop(Long id);
}