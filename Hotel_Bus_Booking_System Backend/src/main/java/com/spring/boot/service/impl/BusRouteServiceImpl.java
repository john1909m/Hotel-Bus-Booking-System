package com.spring.boot.service.impl;

import com.spring.boot.dto.BusRouteDto;
import com.spring.boot.dto.BusRouteRequestDto;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.BusRoute;
import com.spring.boot.model.BusStop;
import com.spring.boot.mapper.BusRouteMapper;
import com.spring.boot.repository.BusRouteRepository;
import com.spring.boot.repository.BusStopRepository;
import com.spring.boot.service.interfaces.BusRouteService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Service implementation for BusRoute entity.
 */
@Service
@AllArgsConstructor
public class BusRouteServiceImpl implements BusRouteService {

    private final BusRouteRepository busRouteRepository;
    private final BusRouteMapper busRouteMapper;
    private final BusStopRepository busStopRepository;
    private final BundleMessageService bundleMessageService;

    @Override
    public BusRouteDto createBusRoute(BusRouteRequestDto busRouteRequestDto) {
        // Validate that origin stop exists
        BusStop originStop = busStopRepository.findById(busRouteRequestDto.getOriginStopId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_stop_not_found")));

        // Validate that destination stop exists
        BusStop destinationStop = busStopRepository.findById(busRouteRequestDto.getDestinationStopId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_stop_not_found")));

        BusRoute busRoute = busRouteMapper.busRouteRequestDtoToBusRoute(busRouteRequestDto);
        busRoute.setOriginStop(originStop);
        busRoute.setDestinationStop(destinationStop);
        BusRoute savedBusRoute = busRouteRepository.save(busRoute);
        return busRouteMapper.busRouteToBusRouteDto(savedBusRoute);
    }

    @Override
    public BusRouteDto getBusRouteById(Long id) {
        BusRoute busRoute = busRouteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_route_not_found")));
        return busRouteMapper.busRouteToBusRouteDto(busRoute);
    }

    @Override
    public java.util.List<BusRouteDto> getAllBusRoutes() {
        return busRouteRepository.findAll().stream()
                .map(busRouteMapper::busRouteToBusRouteDto)
                .toList();
    }

    @Override
    public BusRouteDto updateBusRoute(Long id, BusRouteRequestDto busRouteRequestDto) {
        BusRoute existingBusRoute = busRouteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_route_not_found")));

        // Update fields
        existingBusRoute.setName(busRouteRequestDto.getName());
        existingBusRoute.setDuration(busRouteRequestDto.getDuration());

        // Handle originStop relationship: if provided, validate and set; if not provided, keep existing
        if (busRouteRequestDto.getOriginStopId() != null) {
            BusStop originStop = busStopRepository.findById(busRouteRequestDto.getOriginStopId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_stop_not_found")));
            existingBusRoute.setOriginStop(originStop);
        }

        // Handle destinationStop relationship: if provided, validate and set; if not provided, keep existing
        if (busRouteRequestDto.getDestinationStopId() != null) {
            BusStop destinationStop = busStopRepository.findById(busRouteRequestDto.getDestinationStopId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_stop_not_found")));
            existingBusRoute.setDestinationStop(destinationStop);
        }

        // Save bus route
        BusRoute updatedBusRoute = busRouteRepository.save(existingBusRoute);

        // Return DTO
        return busRouteMapper.busRouteToBusRouteDto(updatedBusRoute);
    }

    @Override
    public void deleteBusRoute(Long id) {
        if (!busRouteRepository.existsById(id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_route_not_found"));
        }
        busRouteRepository.deleteById(id);
    }
}