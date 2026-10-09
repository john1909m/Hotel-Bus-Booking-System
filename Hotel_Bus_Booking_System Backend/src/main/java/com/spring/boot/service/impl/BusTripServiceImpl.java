package com.spring.boot.service.impl;

import com.spring.boot.dto.BusTripDto;
import com.spring.boot.dto.BusTripRequestDto;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.exception.InvalidSeatException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.BusTrip;
import com.spring.boot.mapper.BusTripMapper;
import com.spring.boot.repository.BusTripRepository;
import com.spring.boot.repository.BusRepository;
import com.spring.boot.repository.BusRouteRepository;

import com.spring.boot.service.interfaces.BusTripService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.stream.Collectors;



/**
 * Service implementation for BusTrip entity.
 */
@Service
@AllArgsConstructor
public class BusTripServiceImpl implements BusTripService {

    private final BusTripRepository busTripRepository;
    private final BusTripMapper busTripMapper;
    private final BusRepository busRepository;
    private final BusRouteRepository busRouteRepository;
    private final BundleMessageService bundleMessageService;

    @Override
    public BusTripDto createBusTrip(BusTripRequestDto busTripRequestDto) {
        // Validate that bus exists
        var bus = busRepository.findById(busTripRequestDto.getBusId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_not_found")));

        // Validate that route exists
        var route = busRouteRepository.findById(busTripRequestDto.getRouteId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_route_not_found")));

        // Validate that arrival time is after departure time
        if (busTripRequestDto.getArrivalTime().isBefore(busTripRequestDto.getDepartureTime()) ||
                busTripRequestDto.getArrivalTime().isEqual(busTripRequestDto.getDepartureTime())) {
            throw new IllegalArgumentException(bundleMessageService.getMessage("error.arrival_time_before_departure"));
        }

        BusTrip busTrip = busTripMapper.busTripRequestDtoToBusTrip(busTripRequestDto);
        BusTrip savedBusTrip = busTripRepository.save(busTrip);
        return busTripMapper.busTripToBusTripDto(savedBusTrip);
    }

    @Override
    public BusTripDto getBusTripById(Long id) {
        BusTrip busTrip = busTripRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_trip_not_found")));
        return busTripMapper.busTripToBusTripDto(busTrip);
    }

    @Override
    public java.util.List<BusTripDto> getAllBusTrips() {
        return busTripRepository.findAll().stream()
                .map(busTripMapper::busTripToBusTripDto)
                .collect(Collectors.toList());
    }

    @Override
    public java.util.List<BusTripDto> getBusTripsByBusId(Long busId) {
        return busTripRepository.findByBusId(busId).stream()
                .map(busTripMapper::busTripToBusTripDto)
                .collect(Collectors.toList());
    }

    @Override
    public java.util.List<BusTripDto> getBusTripsByRouteId(Long routeId) {
        return busTripRepository.findByRouteId(routeId).stream()
                .map(busTripMapper::busTripToBusTripDto)
                .collect(Collectors.toList());
    }

    @Override
    public BusTripDto updateBusTrip(Long id, BusTripRequestDto busTripRequestDto) {
        BusTrip existingBusTrip = busTripRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_trip_not_found")));

        // Handle bus relationship: if provided, validate and set; if not provided, keep existing
        if (busTripRequestDto.getBusId() != null) {
            var bus = busRepository.findById(busTripRequestDto.getBusId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_not_found")));
            existingBusTrip.setBus(bus);
        }

        // Handle route relationship: if provided, validate and set; if not provided, keep existing
        if (busTripRequestDto.getRouteId() != null) {
            var route = busRouteRepository.findById(busTripRequestDto.getRouteId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_route_not_found")));
            existingBusTrip.setRoute(route);
        }

        // Validate that arrival time is after departure time
        if (busTripRequestDto.getArrivalTime().isBefore(busTripRequestDto.getDepartureTime()) ||
                busTripRequestDto.getArrivalTime().isEqual(busTripRequestDto.getDepartureTime())) {
            throw new IllegalArgumentException(bundleMessageService.getMessage("error.arrival_time_before_departure"));
        }

        // Update fields
        existingBusTrip.setDepartureTime(busTripRequestDto.getDepartureTime());
        existingBusTrip.setArrivalTime(busTripRequestDto.getArrivalTime());
        existingBusTrip.setPrice(busTripRequestDto.getPrice());

        // Save bus trip
        BusTrip updatedBusTrip = busTripRepository.save(existingBusTrip);

        // Return DTO
        return busTripMapper.busTripToBusTripDto(updatedBusTrip);
    }

    @Override
    public void deleteBusTrip(Long id) {
        if (!busTripRepository.existsById(id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_trip_not_found"));
        }
        busTripRepository.deleteById(id);
    }

    @Override
    public java.util.List<BusTripDto> findSuitableOutgoingTrips(Long hotelId, java.time.LocalDate checkInDate,
                                                                String checkInTime, int timeBufferHours) {
        // This is a simplified implementation
        // In a real system, we would:
        // 1. Find hotel bus stops to get nearby bus stops
        // 2. Find bus routes that stop at those bus stops
        // 3. Find bus trips on those routes
        // 4. Filter trips that arrive early enough for check-in with buffer


        // For now, we'll return all trips as a placeholder
        return getAllBusTrips().stream()
                .filter(trip -> {
                    // Simple time check: trip should arrive before check-in time minus buffer
                    LocalTime tripArrivalTime = trip.getArrivalTime().toLocalTime();
                    LocalTime checkInTimeParsed = LocalTime.parse(checkInTime);
                    LocalTime latestArrivalTime = checkInTimeParsed.minusHours(timeBufferHours);

                    return !tripArrivalTime.isAfter(latestArrivalTime);
                })
                .collect(Collectors.toList());
    }

    @Override
    public java.util.List<BusTripDto> findSuitableReturnTrips(Long hotelId, java.time.LocalDate checkOutDate,
                                                              String checkOutTime, int timeBufferHours) {
        // This is a simplified implementation
        // In a real system, we would:
        // 1. Find hotel bus stops to get nearby bus stops
        // 2. Find bus routes that stop at those bus stops
        // 3. Find bus trips on those routes
        // 4. Filter trips that depart after check-out time plus buffer

        // For now, we'll return all trips as a placeholder
        return getAllBusTrips().stream()
                .filter(trip -> {
                    // Simple time check: trip should depart after check-out time plus buffer
                    LocalTime tripDepartureTime = trip.getDepartureTime().toLocalTime();
                    LocalTime checkOutTimeParsed = LocalTime.parse(checkOutTime);
                    LocalTime earliestDepartureTime = checkOutTimeParsed.plusHours(timeBufferHours);

                    return !tripDepartureTime.isBefore(earliestDepartureTime);
                })
                .collect(Collectors.toList());
    }
}