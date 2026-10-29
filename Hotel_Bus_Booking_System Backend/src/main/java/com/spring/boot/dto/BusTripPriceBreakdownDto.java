package com.spring.boot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

/**
 * Detailed quote and price breakdown for a bus trip based on the bus pricing model.
 * Pricing formula: round2(trip.basePrice * bus.priceFactor + sum(active_feature.surcharge))
 * Rounding rule: BigDecimal with RoundingMode.HALF_UP, scale 2.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Detailed price breakdown for a bus trip based on base price, bus price factor, and active features")
public class BusTripPriceBreakdownDto {

    @Schema(description = "Trip base price", example = "100.00")
    private BigDecimal basePrice;

    @Schema(description = "Bus pricing factor multiplier (0.50 to 3.00)", example = "1.25")
    private BigDecimal priceFactor;

    @Schema(description = "Base price multiplied by bus price factor, rounded to 2 decimal places (HALF_UP)", example = "125.00")
    private BigDecimal factoredPrice;

    @Schema(description = "List of active features and their surcharges included in the total price")
    private List<BusFeatureSummaryDto> features;

    @Schema(description = "Final calculated total trip price (factoredPrice + sum(feature surcharges)), scale 2", example = "135.00")
    private BigDecimal total;
}
