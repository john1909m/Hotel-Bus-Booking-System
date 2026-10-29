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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BusFeatureServiceImplTest {

    @Mock
    private BusFeatureRepository busFeatureRepository;

    @Mock
    private BusFeatureMapper busFeatureMapper;

    @Mock
    private BundleMessageService bundleMessageService;

    @InjectMocks
    private BusFeatureServiceImpl busFeatureService;

    @BeforeEach
    void setUp() {
        lenient().when(bundleMessageService.getMessage(anyString())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("Verification 4: Duplicate feature code on create throws 409 conflict")
    void testDuplicateFeatureCodeThrowsConflict() {
        when(busFeatureRepository.existsByCodeIgnoreCase("WIFI")).thenReturn(true);

        BusFeatureRequestDto request = BusFeatureRequestDto.builder()
                .code("WIFI")
                .nameKey("feature.wifi")
                .surcharge(new BigDecimal("10.00"))
                .active(true)
                .build();

        assertThrows(BookingConflictException.class, () -> busFeatureService.createFeature(request));
        verify(busFeatureRepository, never()).save(any());
    }

    @Test
    @DisplayName("Negative surcharge on create throws 400 validation error")
    void testNegativeSurchargeThrowsValidationError() {
        BusFeatureRequestDto request = BusFeatureRequestDto.builder()
                .code("SNACKS")
                .nameKey("feature.snacks")
                .surcharge(new BigDecimal("-5.00"))
                .active(true)
                .build();

        assertThrows(AnalyticsValidationException.class, () -> busFeatureService.createFeature(request));
    }

    @Test
    @DisplayName("Create feature with valid data persists uppercase code and returns DTO")
    void testCreateFeatureSuccess() {
        when(busFeatureRepository.existsByCodeIgnoreCase("AC")).thenReturn(false);

        BusFeature feature = BusFeature.builder()
                .id(1L)
                .code("AC")
                .nameKey("feature.ac")
                .surcharge(BigDecimal.ZERO)
                .active(true)
                .build();

        when(busFeatureMapper.busFeatureRequestDtoToBusFeature(any())).thenReturn(feature);
        when(busFeatureRepository.save(any())).thenReturn(feature);
        when(busFeatureMapper.busFeatureToBusFeatureDto(feature)).thenReturn(
                BusFeatureDto.builder().id(1L).code("AC").nameKey("feature.ac").surcharge(BigDecimal.ZERO).active(true).build()
        );

        BusFeatureRequestDto request = BusFeatureRequestDto.builder()
                .code("ac")
                .nameKey("feature.ac")
                .surcharge(BigDecimal.ZERO)
                .active(true)
                .build();

        BusFeatureDto created = busFeatureService.createFeature(request);

        assertNotNull(created);
        assertEquals("AC", created.getCode());
        verify(busFeatureRepository).save(any());
    }

    @Test
    @DisplayName("Update feature with duplicate code on another ID throws 409 conflict")
    void testUpdateDuplicateCodeThrowsConflict() {
        BusFeature existing = BusFeature.builder().id(2L).code("WIFI").build();
        when(busFeatureRepository.findById(2L)).thenReturn(Optional.of(existing));
        when(busFeatureRepository.existsByCodeIgnoreCaseAndIdNot("AC", 2L)).thenReturn(true);

        BusFeatureRequestDto request = BusFeatureRequestDto.builder()
                .code("AC")
                .nameKey("feature.ac")
                .surcharge(new BigDecimal("5.00"))
                .active(true)
                .build();

        assertThrows(BookingConflictException.class, () -> busFeatureService.updateFeature(2L, request));
    }

    @Test
    @DisplayName("Delete non-existing feature throws ResourceNotFoundException")
    void testDeleteNonExistingThrowsNotFound() {
        when(busFeatureRepository.existsById(99L)).thenReturn(false);
        assertThrows(ResourceNotFoundException.class, () -> busFeatureService.deleteFeature(99L));
    }
}
