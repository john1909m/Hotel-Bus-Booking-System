package com.spring.boot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Data Transfer Object for BusFeature entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Bus onboard amenity/feature")
public class BusFeatureDto {

    @Schema(description = "Unique ID of the feature", example = "1")
    private Long id;

    @Schema(description = "Unique uppercase feature code", example = "WIFI")
    private String code;

    @Schema(description = "Localization key for the feature name", example = "bus.feature.wifi")
    private String nameKey;

    @Schema(description = "Additional surcharge applied per trip (scale 2)", example = "10.00")
    private BigDecimal surcharge;

    @Schema(description = "Whether this feature is active and eligible to be assigned/priced", example = "true")
    private boolean active;
}
