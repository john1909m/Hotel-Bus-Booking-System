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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;

import java.util.List;


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
    @Caching(evict = {
            @CacheEvict(value = "bus-stops", allEntries = true),
            @CacheEvict(value = "bus-routes", allEntries = true),
            @CacheEvict(value = "bus-trips", allEntries = true)
    })
    public BusStopDto createBusStop(BusStopRequestDto busStopRequestDto) {
        BusStop busStop = busStopMapper.busStopRequestDtoToBusStop(busStopRequestDto);
        BusStop savedBusStop = busStopRepository.save(busStop);
        return busStopMapper.busStopToBusStopDto(savedBusStop);
    }

    @Override
    @Cacheable(value = "bus-stops", key = "#id")
    public BusStopDto getBusStopById(Long id) {
        BusStop busStop = busStopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_stop_not_found")));
        return busStopMapper.busStopToBusStopDto(busStop);
    }

    @Override
    public List<BusStopDto> getAllBusStops() {
        List<BusStopDto> busStopDtos = busStopRepository.findAll().stream()
                .map(busStopMapper::busStopToBusStopDto)
                .toList();
        return busStopDtos;
    }

    @Override
    public List<BusStopDto> lookupBusStops(String query, Pageable pageable) {
        // Use repository method to find bus stops by query with limit
        return busStopRepository.findByQueryLimit(
                query == null || query.isEmpty() ? "" : query,
                pageable
        ).stream()
                .map(busStopMapper::busStopToBusStopDto)
                .toList();
    }

    @Override
    @Cacheable(value = "bus-stops", key = "'list:' + #pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort + ':' + (#q == null ? '' : #q.trim().toLowerCase()) + ':' + (#city == null ? '' : #city.trim().toLowerCase())")
    public Page<BusStopDto> getAllBusStopsPaginated(Pageable pageable,
                                                    String q, String city) {
        // Get paginated results from repository
        Page<BusStop> busStopPage = busStopRepository.findByFilters(
                q == null || q.isEmpty() ? "" : q,
                city == null || city.isEmpty() ? "" : city,
                pageable
        );

        // Convert to DTO page
        return busStopPage.map(busStopMapper::busStopToBusStopDto);
    }

    @Override
    @Caching(evict = {
            @CacheEvict(value = "bus-stops", allEntries = true),
            @CacheEvict(value = "bus-routes", allEntries = true),
            @CacheEvict(value = "bus-trips", allEntries = true)
    })
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
    @Caching(evict = {
            @CacheEvict(value = "bus-stops", allEntries = true),
            @CacheEvict(value = "bus-routes", allEntries = true),
            @CacheEvict(value = "bus-trips", allEntries = true)
    })
    public void deleteBusStop(Long id) {
        if (!busStopRepository.existsById(id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_stop_not_found"));
        }
        busStopRepository.deleteById(id);
    }
}