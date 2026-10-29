package com.spring.boot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.Set;

/**
 * Request body for updating a bus's pricing model and associated feature set.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request body to update bus pricing factor and assigned features")
public class BusPricingUpdateRequestDto {

    @NotNull(message = "error.price_factor_required")
    @DecimalMin(value = "0.50", message = "error.price_factor_range")
    @DecimalMax(value = "3.00", message = "error.price_factor_range")
    @Schema(description = "Bus price multiplier (between 0.50 and 3.00, scale 2)", example = "1.25", requiredMode = Schema.RequiredMode.REQUIRED)
    private BigDecimal priceFactor;

    @Schema(description = "Set of feature IDs assigned to this bus (replaces existing features)", example = "[1, 2]")
    private Set<Long> featureIds;
}
