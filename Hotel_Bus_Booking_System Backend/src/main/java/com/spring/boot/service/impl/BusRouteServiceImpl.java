package com.spring.boot.service.impl;

import com.spring.boot.dto.BusRouteDto;
import com.spring.boot.dto.BusRouteRequestDto;
import com.spring.boot.dto.PageResponse;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.BusRoute;
import com.spring.boot.model.BusStop;
import com.spring.boot.mapper.BusRouteMapper;
import com.spring.boot.repository.BusRouteRepository;
import com.spring.boot.repository.BusStopRepository;
import com.spring.boot.service.interfaces.BusRouteService;
import com.spring.boot.util.PaginationUtil;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;


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
    @Caching(evict = {
            @CacheEvict(value = "bus-routes", allEntries = true),
            @CacheEvict(value = "bus-trips", allEntries = true)
    })
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
    @Cacheable(value = "bus-routes", key = "#id")
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
    public List<BusRouteDto> lookupBusRoutes(String query, int limit) {
        // Validate limit parameter
        if (limit <= 0) {
            limit = 10; // default limit
        }
        if (limit > 50) {
            limit = 50; // max limit for lookups
        }

        // Use repository method to find bus routes by query with limit
        return busRouteRepository.findByQueryLimit(
                query == null || query.isEmpty() ? "" : query,
                PageRequest.of(0, limit)
        ).stream()
                .map(busRouteMapper::busRouteToBusRouteDto)
                .toList();
    }

    @Override
    public PageResponse<BusRouteDto> getAllBusRoutesPaginated(int page, int size, String sortBy, String sortDirection,
                                                              Long originStopId, Long destinationStopId) {
        // Validate and normalize pagination parameters
        if (page < 0) {
            page = 0;
        }
        if (size <= 0) {
            size = 20; // default size
        }
        if (size > 100) {
            size = 100; // max size
        }

        // Validate sortBy field to prevent SQL injection and unauthorized sorting
        String validatedSortBy = validateSortField(sortBy, "id"); // default to id if invalid
        String validatedSortDirection = sortDirection == null || (!sortDirection.equalsIgnoreCase("asc") && !sortDirection.equalsIgnoreCase("desc"))
            ? "asc"
            : sortDirection.toLowerCase();

        // Create Pageable with sorting
        org.springframework.data.domain.Sort sort = org.springframework.data.domain.Sort.by(
            org.springframework.data.domain.Sort.Direction.fromString(validatedSortDirection),
            validatedSortBy
        );
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, sort);

        // Get paginated results from repository
        org.springframework.data.domain.Page<BusRoute> busRoutePage = busRouteRepository.findByFilters(
                originStopId == null ? 0L : originStopId,
                destinationStopId == null ? 0L : destinationStopId,
                pageable
        );

        // Convert to PageResponse using utility
        return PaginationUtil.toPageResponse(busRoutePage, busRouteMapper::busRouteToBusRouteDto);
    }

    /**
     * Validates the sort field against a whitelist of allowed fields.
     *
     * @param sortBy the field to sort by
     * @param defaultField the default field to use if sortBy is invalid
     * @return the validated sort field or the default field
     */
    private String validateSortField(String sortBy, String defaultField) {
        if (sortBy == null || sortBy.isEmpty()) {
            return defaultField;
        }

        // Whitelist of allowed sort fields for BusRoute entity
        Set<String> allowedFields = java.util.Set.of(
            "id", "name", "duration", "originStopId", "destinationStopId", "createdAt", "updatedAt"
        );

        // Check if the field is in the whitelist (case-insensitive)
        return allowedFields.contains(sortBy.toLowerCase()) ? sortBy : defaultField;
    }

    @Override
    @Caching(evict = {
            @CacheEvict(value = "bus-routes", allEntries = true),
            @CacheEvict(value = "bus-trips", allEntries = true)
    })
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
    @Caching(evict = {
            @CacheEvict(value = "bus-routes", allEntries = true),
            @CacheEvict(value = "bus-trips", allEntries = true)
    })
    public void deleteBusRoute(Long id) {
        if (!busRouteRepository.existsById(id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_route_not_found"));
        }
        busRouteRepository.deleteById(id);
    }
}