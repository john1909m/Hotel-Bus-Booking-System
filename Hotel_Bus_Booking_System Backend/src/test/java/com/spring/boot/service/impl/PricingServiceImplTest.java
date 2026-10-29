package com.spring.boot.service.impl;

import com.spring.boot.dto.BusTripPriceBreakdownDto;
import com.spring.boot.exception.AnalyticsValidationException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.Bus;
import com.spring.boot.model.BusFeature;
import com.spring.boot.model.BusTrip;
import com.spring.boot.repository.BusRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PricingServiceImplTest {

    @Mock
    private BusRepository busRepository;

    @Mock
    private BundleMessageService bundleMessageService;

    @InjectMocks
    private PricingServiceImpl pricingService;

    @BeforeEach
    void setUp() {
        lenient().when(bundleMessageService.getMessage(anyString())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("Verification 1: basePrice 100, priceFactor 1.25, WIFI(10) + AC(0) -> quote total 135.00")
    void testStandardPricingCalculation() {
        Bus bus = new Bus();
        bus.setId(1L);
        bus.setPriceFactor(new BigDecimal("1.25"));

        BusFeature wifi = BusFeature.builder()
                .id(10L)
                .code("WIFI")
                .nameKey("feature.wifi")
                .surcharge(new BigDecimal("10.00"))
                .active(true)
                .build();

        BusFeature ac = BusFeature.builder()
                .id(20L)
                .code("AC")
                .nameKey("feature.ac")
                .surcharge(new BigDecimal("0.00"))
                .active(true)
                .build();

        bus.setFeatures(new HashSet<>(Set.of(wifi, ac)));
        when(busRepository.findByIdWithFeatures(1L)).thenReturn(Optional.of(bus));

        BusTrip trip = new BusTrip();
        trip.setId(100L);
        trip.setBus(bus);
        trip.setPrice(new BigDecimal("100.00"));

        BusTripPriceBreakdownDto breakdown = pricingService.calculateBusTripPrice(trip);

        assertNotNull(breakdown);
        assertEquals(new BigDecimal("100.00"), breakdown.getBasePrice());
        assertEquals(new BigDecimal("1.25"), breakdown.getPriceFactor());
        assertEquals(new BigDecimal("125.00"), breakdown.getFactoredPrice());
        assertEquals(2, breakdown.getFeatures().size());
        assertEquals(new BigDecimal("135.00"), breakdown.getTotal());
    }

    @Test
    @DisplayName("Verification 3: Inactive features are excluded from surcharge calculation")
    void testInactiveFeaturesExcludedFromSurcharge() {
        Bus bus = new Bus();
        bus.setId(2L);
        bus.setPriceFactor(new BigDecimal("1.25"));

        BusFeature activeWifi = BusFeature.builder()
                .id(10L)
                .code("WIFI")
                .surcharge(new BigDecimal("10.00"))
                .active(true)
                .build();

        BusFeature inactiveSnacks = BusFeature.builder()
                .id(30L)
                .code("SNACKS")
                .surcharge(new BigDecimal("15.00"))
                .active(false) // Inactive!
                .build();

        bus.setFeatures(new HashSet<>(Set.of(activeWifi, inactiveSnacks)));
        when(busRepository.findByIdWithFeatures(2L)).thenReturn(Optional.of(bus));

        BusTrip trip = new BusTrip();
        trip.setId(200L);
        trip.setBus(bus);
        trip.setPrice(new BigDecimal("100.00"));

        BusTripPriceBreakdownDto breakdown = pricingService.calculateBusTripPrice(trip);

        // 100 * 1.25 + 10 (active wifi) = 135.00 (inactive snacks 15.00 excluded)
        assertEquals(new BigDecimal("135.00"), breakdown.getTotal());
        assertEquals(1, breakdown.getFeatures().size());
        assertEquals("WIFI", breakdown.getFeatures().get(0).getCode());
    }

    @Test
    @DisplayName("Half-Up Rounding Rule (scale 2): 33.33 * 1.15 = 38.3295 -> 38.33")
    void testHalfUpRoundingRule() {
        Bus bus = new Bus();
        bus.setId(3L);
        bus.setPriceFactor(new BigDecimal("1.15"));
        bus.setFeatures(new HashSet<>());
        when(busRepository.findByIdWithFeatures(3L)).thenReturn(Optional.of(bus));

        BusTrip trip = new BusTrip();
        trip.setId(300L);
        trip.setBus(bus);
        trip.setPrice(new BigDecimal("33.33"));

        BusTripPriceBreakdownDto breakdown = pricingService.calculateBusTripPrice(trip);

        assertEquals(new BigDecimal("38.33"), breakdown.getFactoredPrice());
        assertEquals(new BigDecimal("38.33"), breakdown.getTotal());
    }

    @Test
    @DisplayName("Negative base price throws 400 validation error")
    void testNegativeBasePriceThrowsValidationError() {
        Bus bus = new Bus();
        bus.setId(4L);
        bus.setPriceFactor(new BigDecimal("1.00"));

        BusTrip trip = new BusTrip();
        trip.setId(400L);
        trip.setBus(bus);
        trip.setPrice(new BigDecimal("-10.00"));

        assertThrows(AnalyticsValidationException.class, () -> pricingService.calculateBusTripPrice(trip));
    }

    @Test
    @DisplayName("Null bus priceFactor defaults to 1.00")
    void testNullPriceFactorDefaultsToOne() {
        Bus bus = new Bus();
        bus.setId(5L);
        bus.setPriceFactor(null); // defaults to 1.00
        bus.setFeatures(new HashSet<>());
        when(busRepository.findByIdWithFeatures(5L)).thenReturn(Optional.of(bus));

        BusTrip trip = new BusTrip();
        trip.setId(500L);
        trip.setBus(bus);
        trip.setPrice(new BigDecimal("50.00"));

        BusTripPriceBreakdownDto breakdown = pricingService.calculateBusTripPrice(trip);

        assertEquals(new BigDecimal("1.00"), breakdown.getPriceFactor());
        assertEquals(new BigDecimal("50.00"), breakdown.getTotal());
    }
}
