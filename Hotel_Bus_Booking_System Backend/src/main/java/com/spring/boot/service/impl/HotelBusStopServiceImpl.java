package com.spring.boot.service.impl;

import com.spring.boot.dto.HotelBusStopDto;
import com.spring.boot.dto.HotelBusStopRequestDto;
import com.spring.boot.dto.PageResponse;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.HotelBusStop;
import com.spring.boot.mapper.HotelBusStopMapper;
import com.spring.boot.repository.HotelBusStopRepository;
import com.spring.boot.repository.HotelRepository;
import com.spring.boot.repository.BusStopRepository;
import com.spring.boot.service.interfaces.HotelBusStopService;
import com.spring.boot.util.PaginationUtil;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;


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
    @Caching(evict = {
            @CacheEvict(value = "hotels", allEntries = true),
            @CacheEvict(value = "bus-stops", allEntries = true)
    })
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
    public PageResponse<HotelBusStopDto> getAllHotelBusStopsPaginated(int page, int size, String sortBy, String sortDirection,
                                                                     String q, Long hotelId, Long busStopId) {
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
        Sort sort = Sort.by(
            Sort.Direction.fromString(validatedSortDirection),
            validatedSortBy
        );
        Pageable pageable = PageRequest.of(page, size, sort);

        // Get paginated results from repository
        Page<HotelBusStop> hotelBusStopPage = hotelBusStopRepository.findByFilters(
                q == null || q.isEmpty() ? "" : q,
                hotelId == null ? 0L : hotelId,
                busStopId == null ? 0L : busStopId,
                pageable
        );

        // Convert to PageResponse using utility
        return PaginationUtil.toPageResponse(hotelBusStopPage, hotelBusStopMapper::hotelBusStopToHotelBusStopDto);
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
    @Caching(evict = {
            @CacheEvict(value = "hotels", allEntries = true),
            @CacheEvict(value = "bus-stops", allEntries = true)
    })
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
    @Caching(evict = {
            @CacheEvict(value = "hotels", allEntries = true),
            @CacheEvict(value = "bus-stops", allEntries = true)
    })
    public void deleteHotelBusStop(Long id) {
        if (!hotelBusStopRepository.existsById(id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_bus_stop_not_found"));
        }
        hotelBusStopRepository.deleteById(id);
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

        // Whitelist of allowed sort fields for HotelBusStop entity
        Set<String> allowedFields = Set.of(
            "id", "distance", "hotelId", "busStopId", "createdAt", "updatedAt"
        );

        // Check if the field is in the whitelist (case-insensitive)
        return allowedFields.contains(sortBy.toLowerCase()) ? sortBy : defaultField;
    }
}