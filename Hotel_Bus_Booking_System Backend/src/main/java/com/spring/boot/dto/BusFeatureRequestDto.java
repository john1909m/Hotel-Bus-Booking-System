package com.spring.boot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Request Data Transfer Object for creating or updating a BusFeature.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request body for creating or updating a bus feature")
public class BusFeatureRequestDto {

    @NotBlank(message = "error.feature_code_required")
    @Schema(description = "Unique uppercase feature code (e.g. WIFI, AC, CHARGER)", example = "WIFI", requiredMode = Schema.RequiredMode.REQUIRED)
    private String code;

    @NotBlank(message = "error.feature_name_key_required")
    @Schema(description = "Localization key for the feature name", example = "bus.feature.wifi", requiredMode = Schema.RequiredMode.REQUIRED)
    private String nameKey;

    @NotNull(message = "error.surcharge_required")
    @DecimalMin(value = "0.00", message = "error.surcharge_negative")
    @Schema(description = "Surcharge amount (>= 0.00)", example = "10.00", defaultValue = "0.00")
    private BigDecimal surcharge;

    @Schema(description = "Whether the feature is active", example = "true", defaultValue = "true")
    private Boolean active;
}
