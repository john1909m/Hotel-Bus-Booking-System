package com.spring.boot.service.interfaces;

import com.spring.boot.dto.BusTripPriceBreakdownDto;
import com.spring.boot.model.BusTrip;

/**
 * Service responsible for computing bus trip pricing according to the formula:
 * round2( trip.basePrice * bus.priceFactor + sum(feature.surcharge for active features linked to the bus) )
 * All monetary amounts use BigDecimal with RoundingMode.HALF_UP and scale 2.
 */
public interface PricingService {

    /**
     * Calculates the price breakdown and final charged price for a bus trip.
     *
     * @param trip the bus trip containing base price and linked bus
     * @return the detailed price breakdown including factored price and active feature surcharges
     */
    BusTripPriceBreakdownDto calculateBusTripPrice(BusTrip trip);
}
