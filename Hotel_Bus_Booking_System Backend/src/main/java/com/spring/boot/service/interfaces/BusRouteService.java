package com.spring.boot.service.interfaces;

import com.spring.boot.dto.BusRouteDto;
import com.spring.boot.dto.BusRouteRequestDto;
import com.spring.boot.dto.PageResponse;

import java.util.List;


public interface BusRouteService {

    BusRouteDto createBusRoute(BusRouteRequestDto busRouteRequestDto);

    BusRouteDto getBusRouteById(Long id);

    List<BusRouteDto> getAllBusRoutes();

    PageResponse<BusRouteDto> getAllBusRoutesPaginated(int page, int size, String sortBy, String sortDirection,
                                                       Long originStopId, Long destinationStopId);

    List<BusRouteDto> lookupBusRoutes(String query, int limit);

    BusRouteDto updateBusRoute(Long id, BusRouteRequestDto busRouteRequestDto);

    void deleteBusRoute(Long id);
}