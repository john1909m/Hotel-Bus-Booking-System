package com.spring.boot.service.impl;

import com.spring.boot.dto.BusTripDto;
import com.spring.boot.dto.BusTripInfoDto;
import com.spring.boot.dto.BusTripRequestDto;
import com.spring.boot.enums.BusTripStatus;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.BusTrip;
import com.spring.boot.mapper.BusTripMapper;
import com.spring.boot.repository.BusTripRepository;
import com.spring.boot.repository.BusRepository;
import com.spring.boot.repository.BusRouteRepository;
import com.spring.boot.service.interfaces.BusTripService;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import com.spring.boot.exception.BookingConflictException;
import com.spring.boot.repository.BusBookingRepository;
import org.springframework.transaction.annotation.Transactional;

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
    private final BusBookingRepository busBookingRepository;
    private final BundleMessageService bundleMessageService;

    @Override
    @Transactional
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
    public List<BusTripDto> getBusTripsByBusId(Long busId) {
        return busTripRepository.findByBusId(busId).stream()
                .map(busTripMapper::busTripToBusTripDto)
                .toList();
    }

    @Override
    public List<BusTripDto> getBusTripsByRouteId(Long routeId) {
        return busTripRepository.findByRouteId(routeId).stream()
                .map(busTripMapper::busTripToBusTripDto)
                .toList();
    }

    @Override
    public List<BusTripDto> lookupBusTrips(String query, Pageable pageable) {
        // Use repository method to find bus trips by query with limit
        return busTripRepository.findByQueryLimit(
                query == null || query.isEmpty() ? "" : query,
                pageable
        ).stream()
                .map(busTripMapper::busTripToBusTripDto)
                .collect(Collectors.toList());
    }

    @Override
    public Page<BusTripDto> getAllBusTripsPaginated(Pageable pageable,
                                                    Long busId, Long routeId, BusTripStatus status,
                                                    LocalDateTime departureAfter, LocalDateTime departureBefore) {
        // Get paginated results from repository
        Page<BusTrip> busTripPage = busTripRepository.findByFilters(
                busId == null ? 0L : busId,
                routeId == null ? 0L : routeId,
                status,
                departureAfter,
                departureBefore,
                pageable
        );

        // Convert to DTO page
        return busTripPage.map(busTripMapper::busTripToBusTripDto);
    }

    @Override
    @Transactional
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
    @Transactional
    public void deleteBusTrip(Long id) {
        if (!busTripRepository.existsById(id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_trip_not_found"));
        }
        if (busBookingRepository.existsByBusTripId(id)) {
            throw new BookingConflictException(bundleMessageService.getMessage("error.trip_has_bookings"));
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

    @Override
    public List<BusTripInfoDto> searchBusTrips(String originCity, String destinationCity, LocalDate departureDate) {
        String cleanOrigin = (originCity != null && !originCity.trim().isEmpty()) ? originCity.trim() : null;
        String cleanDest = (destinationCity != null && !destinationCity.trim().isEmpty()) ? destinationCity.trim() : null;

        LocalDateTime departureAfter = departureDate != null ? departureDate.atStartOfDay() : null;
        LocalDateTime departureBefore = departureDate != null ? departureDate.atTime(LocalTime.MAX) : null;

        Pageable pageable = PageRequest.of(0, 10);
        List<BusTrip> trips = busTripRepository.findTripsByCities(cleanOrigin, cleanDest, departureAfter, departureBefore, pageable);

        return trips.stream()
                .map(bt -> new BusTripInfoDto(
                        bt.getId(),
                        bt.getRoute() != null ? bt.getRoute().getId() : null,
                        bt.getRoute() != null ? bt.getRoute().getName() : null,
                        bt.getRoute() != null && bt.getRoute().getOriginStop() != null ? bt.getRoute().getOriginStop().getCity() : null,
                        bt.getRoute() != null && bt.getRoute().getOriginStop() != null ? bt.getRoute().getOriginStop().getName() : null,
                        bt.getRoute() != null && bt.getRoute().getDestinationStop() != null ? bt.getRoute().getDestinationStop().getCity() : null,
                        bt.getRoute() != null && bt.getRoute().getDestinationStop() != null ? bt.getRoute().getDestinationStop().getName() : null,
                        bt.getDepartureTime(),
                        bt.getArrivalTime(),
                        bt.getPrice(),
                        bt.getStatus()
                ))
                .toList();
    }
}