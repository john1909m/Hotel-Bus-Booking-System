package com.spring.boot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Summary breakdown of an active feature and its surcharge included in trip pricing.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Breakdown item for an active onboard feature")
public class BusFeatureSummaryDto {

    @Schema(description = "Feature code", example = "WIFI")
    private String code;

    @Schema(description = "Feature surcharge added to trip price (scale 2)", example = "10.00")
    private BigDecimal surcharge;
}
