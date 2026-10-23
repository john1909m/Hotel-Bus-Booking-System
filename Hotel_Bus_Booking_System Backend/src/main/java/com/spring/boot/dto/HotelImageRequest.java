package com.spring.boot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request payload for adding or updating a hotel image.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload for adding or updating a hotel gallery image")
public class HotelImageRequest {

    @NotBlank(message = "error.invalid_image_url")
    @Size(max = 2048, message = "error.invalid_image_url")
    @Schema(description = "Public HTTPS URL of the image from an allowed host", example = "https://images.example.com/hotels/1/lobby.jpg", requiredMode = Schema.RequiredMode.REQUIRED, maxLength = 2048)
    private String url;

    @Schema(description = "Room type this image belongs to, or null for hotel-level gallery (e.g. SINGLE, DOUBLE, SUITE, DELUXE)", example = "DOUBLE", nullable = true)
    private String roomType;

    @Schema(description = "Display sort order for the image (lower numbers appear first)", example = "0", defaultValue = "0")
    private Integer sortOrder = 0;
}
