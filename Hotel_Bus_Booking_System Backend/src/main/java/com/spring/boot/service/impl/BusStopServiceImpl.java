package com.spring.boot.service.impl;

import com.spring.boot.dto.BusStopDto;
import com.spring.boot.dto.BusStopRequestDto;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.BusStop;
import com.spring.boot.mapper.BusStopMapper;
import com.spring.boot.repository.BusStopRepository;
import com.spring.boot.service.interfaces.BusStopService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;



/**
 * Service implementation for BusStop entity.
 */
@Service
@AllArgsConstructor
public class BusStopServiceImpl implements BusStopService {

    private final BusStopRepository busStopRepository;
    private final BusStopMapper busStopMapper;
    private final BundleMessageService bundleMessageService;

    @Override
    public BusStopDto createBusStop(BusStopRequestDto busStopRequestDto) {
        BusStop busStop = busStopMapper.busStopRequestDtoToBusStop(busStopRequestDto);
        BusStop savedBusStop = busStopRepository.save(busStop);
        return busStopMapper.busStopToBusStopDto(savedBusStop);
    }

    @Override
    public BusStopDto getBusStopById(Long id) {
        BusStop busStop = busStopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_stop_not_found")));
        return busStopMapper.busStopToBusStopDto(busStop);
    }

    @Override
    public java.util.List<BusStopDto> getAllBusStops() {
        return busStopRepository.findAll().stream()
                .map(busStopMapper::busStopToBusStopDto)
                .toList();
    }

    @Override
    public BusStopDto updateBusStop(Long id, BusStopRequestDto busStopRequestDto) {
        BusStop existingBusStop = busStopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_stop_not_found")));

        // Update fields
        existingBusStop.setName(busStopRequestDto.getName());
        existingBusStop.setCity(busStopRequestDto.getCity());
        existingBusStop.setAddress(busStopRequestDto.getAddress());
        existingBusStop.setLatitude(busStopRequestDto.getLatitude());
        existingBusStop.setLongitude(busStopRequestDto.getLongitude());

        // Save bus stop
        BusStop updatedBusStop = busStopRepository.save(existingBusStop);

        // Return DTO
        return busStopMapper.busStopToBusStopDto(updatedBusStop);
    }

    @Override
    public void deleteBusStop(Long id) {
        if (!busStopRepository.existsById(id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_stop_not_found"));
        }
        busStopRepository.deleteById(id);
    }
}