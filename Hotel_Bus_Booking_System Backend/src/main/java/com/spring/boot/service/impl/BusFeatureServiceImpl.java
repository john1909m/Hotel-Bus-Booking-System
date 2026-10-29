package com.spring.boot.service.impl;

import com.spring.boot.dto.BusFeatureDto;
import com.spring.boot.dto.BusFeatureRequestDto;
import com.spring.boot.exception.AnalyticsValidationException;
import com.spring.boot.exception.BookingConflictException;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.mapper.BusFeatureMapper;
import com.spring.boot.model.BusFeature;
import com.spring.boot.repository.BusFeatureRepository;
import com.spring.boot.service.interfaces.BusFeatureService;
import lombok.AllArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Service implementation for BusFeature entity with cache invalidation on mutations.
 */
@Service
@AllArgsConstructor
public class BusFeatureServiceImpl implements BusFeatureService {

    private final BusFeatureRepository busFeatureRepository;
    private final BusFeatureMapper busFeatureMapper;
    private final BundleMessageService bundleMessageService;

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "bus-features", key = "'all'")
    public List<BusFeatureDto> getAllFeatures() {
        return busFeatureRepository.findAll().stream()
                .map(busFeatureMapper::busFeatureToBusFeatureDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BusFeatureDto getFeatureById(Long id) {
        BusFeature feature = busFeatureRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.feature_not_found")));
        return busFeatureMapper.busFeatureToBusFeatureDto(feature);
    }

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "bus-features", allEntries = true),
            @CacheEvict(value = "bus-trips", allEntries = true)
    })
    public BusFeatureDto createFeature(BusFeatureRequestDto request) {
        if (request.getCode() == null || request.getCode().trim().isEmpty()) {
            throw new AnalyticsValidationException("code", "error.feature_code_required");
        }
        String cleanCode = request.getCode().trim().toUpperCase();

        if (busFeatureRepository.existsByCodeIgnoreCase(cleanCode)) {
            throw new BookingConflictException(bundleMessageService.getMessage("error.data_conflict"));
        }

        if (request.getSurcharge() != null && request.getSurcharge().compareTo(BigDecimal.ZERO) < 0) {
            throw new AnalyticsValidationException("surcharge", "error.surcharge_negative");
        }

        BusFeature feature = busFeatureMapper.busFeatureRequestDtoToBusFeature(request);
        feature.setCode(cleanCode);
        if (feature.getSurcharge() == null) {
            feature.setSurcharge(BigDecimal.ZERO);
        }

        BusFeature saved = busFeatureRepository.save(feature);
        return busFeatureMapper.busFeatureToBusFeatureDto(saved);
    }

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "bus-features", allEntries = true),
            @CacheEvict(value = "bus-trips", allEntries = true)
    })
    public BusFeatureDto updateFeature(Long id, BusFeatureRequestDto request) {
        BusFeature existing = busFeatureRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.feature_not_found")));

        if (request.getCode() == null || request.getCode().trim().isEmpty()) {
            throw new AnalyticsValidationException("code", "error.feature_code_required");
        }
        String cleanCode = request.getCode().trim().toUpperCase();

        if (busFeatureRepository.existsByCodeIgnoreCaseAndIdNot(cleanCode, id)) {
            throw new BookingConflictException(bundleMessageService.getMessage("error.data_conflict"));
        }

        if (request.getSurcharge() != null && request.getSurcharge().compareTo(BigDecimal.ZERO) < 0) {
            throw new AnalyticsValidationException("surcharge", "error.surcharge_negative");
        }

        busFeatureMapper.updateBusFeatureFromDto(request, existing);
        existing.setCode(cleanCode);

        BusFeature updated = busFeatureRepository.save(existing);
        return busFeatureMapper.busFeatureToBusFeatureDto(updated);
    }

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "bus-features", allEntries = true),
            @CacheEvict(value = "bus-trips", allEntries = true)
    })
    public void deleteFeature(Long id) {
        if (!busFeatureRepository.existsById(id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.feature_not_found"));
        }
        busFeatureRepository.deleteById(id);
    }
}
