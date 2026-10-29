package com.spring.boot.service.interfaces;

import com.spring.boot.dto.BusFeatureDto;
import com.spring.boot.dto.BusFeatureRequestDto;

import java.util.List;

/**
 * Service interface for managing onboard bus features/amenities.
 */
public interface BusFeatureService {

    List<BusFeatureDto> getAllFeatures();

    BusFeatureDto getFeatureById(Long id);

    BusFeatureDto createFeature(BusFeatureRequestDto request);

    BusFeatureDto updateFeature(Long id, BusFeatureRequestDto request);

    void deleteFeature(Long id);
}
