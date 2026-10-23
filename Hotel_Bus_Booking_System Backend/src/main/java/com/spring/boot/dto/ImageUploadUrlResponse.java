package com.spring.boot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

/**
 * Response DTO containing presigned upload URL and metadata for frontend upload.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Response containing presigned PUT upload URL and required headers")
public class ImageUploadUrlResponse {

    @Schema(description = "Presigned PUT URL for direct storage upload")
    private String uploadUrl;

    @Schema(description = "Final public URL of the uploaded image to save with POST /api/hotels/{hotelId}/images")
    private String publicUrl;

    @Schema(description = "Validity duration in seconds", example = "300")
    private int expiresInSeconds;

    @Schema(description = "HTTP method to use for upload", example = "PUT")
    private String method;

    @Schema(description = "Headers required during the PUT upload")
    private Map<String, String> requiredHeaders;
}
