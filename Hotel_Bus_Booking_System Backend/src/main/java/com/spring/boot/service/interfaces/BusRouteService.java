package com.spring.boot.service.interfaces;

import com.spring.boot.dto.BusRouteDto;
import com.spring.boot.dto.BusRouteRequestDto;

import java.util.List;



/**
 * Service interface for BusRoute entity.
 */
public interface BusRouteService {

    BusRouteDto createBusRoute(BusRouteRequestDto busRouteRequestDto);

    BusRouteDto getBusRouteById(Long id);

    List<BusRouteDto> getAllBusRoutes();

    BusRouteDto updateBusRoute(Long id, BusRouteRequestDto busRouteRequestDto);

    void deleteBusRoute(Long id);
}