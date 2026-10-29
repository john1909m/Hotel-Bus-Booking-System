package com.spring.boot.service.impl;

import com.spring.boot.dto.BusDto;
import com.spring.boot.dto.BusPricingUpdateRequestDto;
import com.spring.boot.exception.AnalyticsValidationException;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.mapper.BusMapper;
import com.spring.boot.model.Bus;
import com.spring.boot.model.BusFeature;
import com.spring.boot.repository.BusBookingRepository;
import com.spring.boot.repository.BusFeatureRepository;
import com.spring.boot.repository.BusRepository;
import com.spring.boot.repository.BusSeatRepository;
import com.spring.boot.repository.BusTripRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BusPricingUpdateServiceTest {

    @Mock
    private BusRepository busRepository;

    @Mock
    private BusMapper busMapper;

    @Mock
    private BusTripRepository busTripRepository;

    @Mock
    private BusSeatRepository busSeatRepository;

    @Mock
    private BusBookingRepository busBookingRepository;

    @Mock
    private BusFeatureRepository busFeatureRepository;

    @Mock
    private BundleMessageService bundleMessageService;

    @InjectMocks
    private BusServiceImpl busService;

    private Bus bus;

    @BeforeEach
    void setUp() {
        lenient().when(bundleMessageService.getMessage(anyString())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(bundleMessageService.getMessage(anyString(), any(Object[].class))).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            Object[] args = inv.getArgument(1);
            return (args != null && args.length > 0) ? key + " [" + args[0] + "]" : key;
        });

        bus = new Bus();
        bus.setId(10L);
        bus.setPriceFactor(new BigDecimal("1.00"));
        bus.setFeatures(new HashSet<>());
    }

    @Test
    @DisplayName("Verification 4: Factor 0.40 or 3.50 throws 400 validation exception")
    void testPriceFactorOutOfRangeThrowsValidation() {
        when(busRepository.findByIdWithFeatures(10L)).thenReturn(Optional.of(bus));

        BusPricingUpdateRequestDto lowDto = BusPricingUpdateRequestDto.builder()
                .priceFactor(new BigDecimal("0.40"))
                .build();

        assertThrows(AnalyticsValidationException.class, () -> busService.updateBusPricing(10L, lowDto));

        BusPricingUpdateRequestDto highDto = BusPricingUpdateRequestDto.builder()
                .priceFactor(new BigDecimal("3.50"))
                .build();

        assertThrows(AnalyticsValidationException.class, () -> busService.updateBusPricing(10L, highDto));
    }

    @Test
    @DisplayName("Assigning inactive feature ID throws 400 error.feature_inactive")
    void testAssigningInactiveFeatureThrowsValidationError() {
        when(busRepository.findByIdWithFeatures(10L)).thenReturn(Optional.of(bus));

        BusFeature inactiveFeature = BusFeature.builder()
                .id(25L)
                .code("SNACKS")
                .active(false) // inactive
                .build();

        when(busFeatureRepository.findById(25L)).thenReturn(Optional.of(inactiveFeature));

        BusPricingUpdateRequestDto dto = BusPricingUpdateRequestDto.builder()
                .priceFactor(new BigDecimal("1.25"))
                .featureIds(Set.of(25L))
                .build();

        AnalyticsValidationException ex = assertThrows(AnalyticsValidationException.class, () -> busService.updateBusPricing(10L, dto));
        assertTrue(ex.getMessage().contains("error.feature_inactive"));
    }

    @Test
    @DisplayName("Assigning unknown feature ID throws ResourceNotFoundException")
    void testAssigningUnknownFeatureThrowsNotFound() {
        when(busRepository.findByIdWithFeatures(10L)).thenReturn(Optional.of(bus));
        when(busFeatureRepository.findById(999L)).thenReturn(Optional.empty());

        BusPricingUpdateRequestDto dto = BusPricingUpdateRequestDto.builder()
                .priceFactor(new BigDecimal("1.25"))
                .featureIds(Set.of(999L))
                .build();

        assertThrows(ResourceNotFoundException.class, () -> busService.updateBusPricing(10L, dto));
    }

    @Test
    @DisplayName("Valid pricing update updates factor and replaces feature set")
    void testValidPricingUpdateSuccess() {
        when(busRepository.findByIdWithFeatures(10L)).thenReturn(Optional.of(bus));

        BusFeature wifi = BusFeature.builder().id(1L).code("WIFI").active(true).build();
        when(busFeatureRepository.findById(1L)).thenReturn(Optional.of(wifi));

        when(busRepository.save(any(Bus.class))).thenAnswer(inv -> inv.getArgument(0));

        BusDto resultDto = new BusDto();
        resultDto.setId(10L);
        resultDto.setPriceFactor(new BigDecimal("1.25"));
        when(busMapper.busToBusDto(any(Bus.class))).thenReturn(resultDto);

        BusPricingUpdateRequestDto dto = BusPricingUpdateRequestDto.builder()
                .priceFactor(new BigDecimal("1.25"))
                .featureIds(Set.of(1L))
                .build();

        BusDto updated = busService.updateBusPricing(10L, dto);

        assertNotNull(updated);
        assertEquals(new BigDecimal("1.25"), updated.getPriceFactor());
        assertEquals(new BigDecimal("1.25"), bus.getPriceFactor());
        assertEquals(1, bus.getFeatures().size());
    }
}
