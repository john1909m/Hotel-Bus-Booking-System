package com.spring.boot.service.impl;

import com.spring.boot.dto.BusRouteDto;
import com.spring.boot.dto.BusRouteRequestDto;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.BusRoute;
import com.spring.boot.mapper.BusRouteMapper;
import com.spring.boot.repository.BusRouteRepository;
//import com.spring.boot.service.
import com.spring.boot.service.interfaces.BusRouteService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

//interface.BusRouteService;
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
    private final BundleMessageService bundleMessageService;

    @Override
    public BusRouteDto createBusRoute(BusRouteRequestDto busRouteRequestDto) {
        BusRoute busRoute = busRouteMapper.busRouteRequestDtoToBusRoute(busRouteRequestDto);
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
        // Note: originStop and destinationStop would typically be updated separately

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