package com.spring.boot.service.impl;

import com.spring.boot.dto.BusFeatureSummaryDto;
import com.spring.boot.dto.BusTripPriceBreakdownDto;
import com.spring.boot.model.Bus;
import com.spring.boot.model.BusFeature;
import com.spring.boot.model.BusTrip;
import com.spring.boot.repository.BusRepository;
import com.spring.boot.service.interfaces.PricingService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

/**
 * Single source of truth for bus trip pricing calculation.
 * Formula: round2( trip.basePrice * bus.priceFactor + sum(feature.surcharge for active features) )
 */
@Service
@AllArgsConstructor
public class PricingServiceImpl implements PricingService {

    private final BusRepository busRepository;

    @Override
    @Transactional(readOnly = true)
    public BusTripPriceBreakdownDto calculateBusTripPrice(BusTrip trip) {
        if (trip == null || trip.getPrice() == null) {
            throw new IllegalArgumentException("Trip and trip price must not be null");
        }
        if (trip.getPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new com.spring.boot.exception.AnalyticsValidationException("basePrice", "error.base_price_negative");
        }

        BigDecimal basePrice = trip.getPrice().setScale(2, RoundingMode.HALF_UP);

        // Resolve bus and eager features
        Bus bus = trip.getBus();
        if (bus != null && bus.getId() != null) {
            bus = busRepository.findByIdWithFeatures(bus.getId()).orElse(bus);
        }

        BigDecimal priceFactor = (bus != null && bus.getPriceFactor() != null)
                ? bus.getPriceFactor()
                : new BigDecimal("1.00");
        priceFactor = priceFactor.setScale(2, RoundingMode.HALF_UP);

        BigDecimal factoredPrice = basePrice.multiply(priceFactor).setScale(2, RoundingMode.HALF_UP);

        List<BusFeatureSummaryDto> featureSummaries = new ArrayList<>();
        BigDecimal totalSurcharges = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        if (bus != null && bus.getFeatures() != null) {
            Set<BusFeature> features = bus.getFeatures();
            for (BusFeature feature : features) {
                // Include ONLY active features
                if (feature.isActive()) {
                    BigDecimal surcharge = feature.getSurcharge() != null
                            ? feature.getSurcharge().setScale(2, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

                    totalSurcharges = totalSurcharges.add(surcharge);

                    featureSummaries.add(BusFeatureSummaryDto.builder()
                            .code(feature.getCode())
                            .surcharge(surcharge)
                            .build());
                }
            }
        }

        // Sort feature summaries alphabetically by code for predictable, clean output
        featureSummaries.sort(Comparator.comparing(BusFeatureSummaryDto::getCode));

        BigDecimal finalTotal = factoredPrice.add(totalSurcharges).setScale(2, RoundingMode.HALF_UP);

        return BusTripPriceBreakdownDto.builder()
                .basePrice(basePrice)
                .priceFactor(priceFactor)
                .factoredPrice(factoredPrice)
                .features(featureSummaries)
                .total(finalTotal)
                .build();
    }
}
