package com.spring.boot.service.impl;

import com.spring.boot.dto.HotelBusStopDto;
import com.spring.boot.dto.HotelBusStopRequestDto;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.HotelBusStop;
import com.spring.boot.mapper.HotelBusStopMapper;
import com.spring.boot.repository.HotelBusStopRepository;
import com.spring.boot.repository.HotelRepository;
import com.spring.boot.repository.BusStopRepository;
import com.spring.boot.service.interfaces.HotelBusStopService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Service implementation for HotelBusStop entity.
 */
@Service
@AllArgsConstructor
public class HotelBusStopServiceImpl implements HotelBusStopService {

    private final HotelBusStopRepository hotelBusStopRepository;
    private final HotelBusStopMapper hotelBusStopMapper;
    private final HotelRepository hotelRepository;
    private final BusStopRepository busStopRepository;
    private final BundleMessageService bundleMessageService;

    @Override
    public HotelBusStopDto createHotelBusStop(HotelBusStopRequestDto hotelBusStopRequestDto) {
        // Validate that hotel exists
        var hotel = hotelRepository.findById(hotelBusStopRequestDto.getHotelId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_not_found")));

        // Validate that bus stop exists
        var busStop = busStopRepository.findById(hotelBusStopRequestDto.getBusStopId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_stop_not_found")));

        HotelBusStop hotelBusStop = hotelBusStopMapper.hotelBusStopRequestDtoToHotelBusStop(hotelBusStopRequestDto);
        hotelBusStop.setHotel(hotel);
        hotelBusStop.setBusStop(busStop);
        HotelBusStop savedHotelBusStop = hotelBusStopRepository.save(hotelBusStop);
        return hotelBusStopMapper.hotelBusStopToHotelBusStopDto(savedHotelBusStop);
    }

    @Override
    public HotelBusStopDto getHotelBusStopById(Long id) {
        HotelBusStop hotelBusStop = hotelBusStopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_bus_stop_not_found")));
        return hotelBusStopMapper.hotelBusStopToHotelBusStopDto(hotelBusStop);
    }

    @Override
    public java.util.List<HotelBusStopDto> getAllHotelBusStops() {
        return hotelBusStopRepository.findAll().stream()
                .map(hotelBusStopMapper::hotelBusStopToHotelBusStopDto)
                .toList();
    }

    @Override
    public java.util.List<HotelBusStopDto> getHotelBusStopsByHotelId(Long hotelId) {
        return hotelBusStopRepository.findByHotelId(hotelId).stream()
                .map(hotelBusStopMapper::hotelBusStopToHotelBusStopDto)
                .toList();
    }

    @Override
    public java.util.List<HotelBusStopDto> getHotelBusStopsByBusStopId(Long busStopId) {
        return hotelBusStopRepository.findByBusStopId(busStopId).stream()
                .map(hotelBusStopMapper::hotelBusStopToHotelBusStopDto)
                .toList();
    }

    @Override
    public HotelBusStopDto updateHotelBusStop(Long id, HotelBusStopRequestDto hotelBusStopRequestDto) {
        HotelBusStop existingHotelBusStop = hotelBusStopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_bus_stop_not_found")));

        // Update fields
        existingHotelBusStop.setDistance(hotelBusStopRequestDto.getDistance());

        // Handle hotel relationship: if provided, validate and set; if not provided, keep existing
        if (hotelBusStopRequestDto.getHotelId() != null) {
            var hotel = hotelRepository.findById(hotelBusStopRequestDto.getHotelId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_not_found")));
            existingHotelBusStop.setHotel(hotel);
        }

        // Handle bus stop relationship: if provided, validate and set; if not provided, keep existing
        if (hotelBusStopRequestDto.getBusStopId() != null) {
            var busStop = busStopRepository.findById(hotelBusStopRequestDto.getBusStopId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_stop_not_found")));
            existingHotelBusStop.setBusStop(busStop);
        }

        // Save hotel bus stop
        HotelBusStop updatedHotelBusStop = hotelBusStopRepository.save(existingHotelBusStop);

        // Return DTO
        return hotelBusStopMapper.hotelBusStopToHotelBusStopDto(updatedHotelBusStop);
    }

    @Override
    public void deleteHotelBusStop(Long id) {
        if (!hotelBusStopRepository.existsById(id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_bus_stop_not_found"));
        }
        hotelBusStopRepository.deleteById(id);
    }
}