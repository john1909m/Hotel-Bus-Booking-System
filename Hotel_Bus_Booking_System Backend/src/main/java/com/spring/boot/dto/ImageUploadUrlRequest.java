package com.spring.boot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request DTO for generating a short-lived presigned upload URL.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request body for generating a presigned image upload URL")
public class ImageUploadUrlRequest {

    @NotNull(message = "error.hotel_not_found")
    @Schema(description = "ID of the hotel to upload an image for", example = "1", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long hotelId;

    @Schema(description = "Room type (e.g. SINGLE, DOUBLE, SUITE, DELUXE), or null for a hotel-level gallery image", example = "DOUBLE", nullable = true)
    private String roomType;

    @NotBlank(message = "error.invalid_content_type")
    @Schema(description = "MIME content type (must be image/jpeg, image/png, or image/webp)", example = "image/webp", requiredMode = Schema.RequiredMode.REQUIRED)
    private String contentType;
}
