package com.spring.boot.service.impl;

import com.spring.boot.dto.BusDto;
import com.spring.boot.dto.BusRequestDto;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.Bus;
import com.spring.boot.mapper.BusMapper;
import com.spring.boot.repository.BusRepository;
import com.spring.boot.service.interfaces.BusService;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;


/**
 * Service implementation for Bus entity.
 */
@Service
@AllArgsConstructor
public class BusServiceImpl implements BusService {

    private final BusRepository busRepository;
    private final com.spring.boot.repository.BusFeatureRepository busFeatureRepository;
    private final BusMapper busMapper;
    private final BundleMessageService bundleMessageService;

    @Override
    @org.springframework.cache.annotation.Caching(evict = {
            @org.springframework.cache.annotation.CacheEvict(value = "buses", allEntries = true),
            @org.springframework.cache.annotation.CacheEvict(value = "bus-trips", allEntries = true)
    })
    public BusDto createBus(BusRequestDto busRequestDto) {
        Bus bus = busMapper.busRequestDtoToBus(busRequestDto);
        Bus savedBus = busRepository.save(bus);
        return busMapper.busToBusDto(savedBus);
    }

    @Override
    public BusDto getBusById(Long id) {
        Bus bus = busRepository.findByIdWithFeatures(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_not_found")));
        return busMapper.busToBusDto(bus);
    }

    @Override
    public java.util.List<BusDto> getAllBuses() {
        return busRepository.findAll().stream()
                .map(busMapper::busToBusDto)
                .toList();
    }

    @Override
    public List<BusDto> lookupBuses(String query, Pageable pageable) {
        // Use repository method to find buses by query with limit
        return busRepository.findByQueryLimit(
                query == null || query.isEmpty() ? "" : query,
                pageable
        ).stream()
                .map(busMapper::busToBusDto)
                .toList();
    }

    @Override
    public Page<BusDto> getAllBusesPaginated(Pageable pageable,
                                             String q, String busType, String company) {
        // Get paginated results from repository
        Page<Bus> busPage = busRepository.findByFilters(
                q == null || q.isEmpty() ? "" : q,
                busType == null || busType.isEmpty() ? "" : busType,
                company == null || company.isEmpty() ? "" : company,
                pageable
        );

        // Convert to DTO page
        return busPage.map(busMapper::busToBusDto);
    }

    @Override
    @org.springframework.cache.annotation.Caching(evict = {
            @org.springframework.cache.annotation.CacheEvict(value = "buses", allEntries = true),
            @org.springframework.cache.annotation.CacheEvict(value = "bus-trips", allEntries = true)
    })
    public BusDto updateBus(Long id, BusRequestDto busRequestDto) {
        Bus existingBus = busRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_not_found")));

        // Update fields
        existingBus.setBusNumber(busRequestDto.getBusNumber());
        existingBus.setCompany(busRequestDto.getCompany());
        existingBus.setCapacity(busRequestDto.getCapacity());
        existingBus.setBusType(busRequestDto.getBusType());

        // Save bus
        Bus updatedBus = busRepository.save(existingBus);

        // Return DTO
        return busMapper.busToBusDto(updatedBus);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.cache.annotation.Caching(evict = {
            @org.springframework.cache.annotation.CacheEvict(value = "buses", allEntries = true),
            @org.springframework.cache.annotation.CacheEvict(value = "bus-trips", allEntries = true)
    })
    public BusDto updateBusPricing(Long id, com.spring.boot.dto.BusPricingUpdateRequestDto pricingDto) {
        Bus existingBus = busRepository.findByIdWithFeatures(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_not_found")));

        if (pricingDto.getPriceFactor() == null ||
                pricingDto.getPriceFactor().compareTo(new java.math.BigDecimal("0.50")) < 0 ||
                pricingDto.getPriceFactor().compareTo(new java.math.BigDecimal("3.00")) > 0) {
            throw new com.spring.boot.exception.AnalyticsValidationException("priceFactor", "error.price_factor_range");
        }

        existingBus.setPriceFactor(pricingDto.getPriceFactor());

        // Replace feature set
        java.util.Set<com.spring.boot.model.BusFeature> updatedFeatures = new java.util.HashSet<>();
        if (pricingDto.getFeatureIds() != null && !pricingDto.getFeatureIds().isEmpty()) {
            for (Long featureId : pricingDto.getFeatureIds()) {
                com.spring.boot.model.BusFeature feature = busFeatureRepository.findById(featureId)
                        .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.feature_not_found")));

                if (!feature.isActive()) {
                    throw new com.spring.boot.exception.AnalyticsValidationException("featureIds",
                            bundleMessageService.getMessage("error.feature_inactive", new Object[]{feature.getCode()}));
                }
                updatedFeatures.add(feature);
            }
        }
        existingBus.setFeatures(updatedFeatures);

        Bus savedBus = busRepository.save(existingBus);
        return busMapper.busToBusDto(savedBus);
    }

    @Override
    @org.springframework.cache.annotation.Caching(evict = {
            @org.springframework.cache.annotation.CacheEvict(value = "buses", allEntries = true),
            @org.springframework.cache.annotation.CacheEvict(value = "bus-trips", allEntries = true)
    })
    public void deleteBus(Long id) {
        if (!busRepository.existsById(id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_not_found"));
        }
        busRepository.deleteById(id);
    }
}