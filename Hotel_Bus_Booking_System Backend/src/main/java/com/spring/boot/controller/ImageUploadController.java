package com.spring.boot.controller;

import com.spring.boot.dto.ImageUploadUrlRequest;
import com.spring.boot.dto.ImageUploadUrlResponse;
import com.spring.boot.service.interfaces.ImageUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller for generating presigned image upload URLs.
 */
@RestController
@RequestMapping("/api/images")
@AllArgsConstructor
@Tag(name = "Image Upload", description = "Endpoints for presigned image uploads directly to storage")
public class ImageUploadController {

    private final ImageUploadService imageUploadService;

    @Operation(
            summary = "Get presigned image upload URL (Admin only)",
            description = "Generates a short-lived presigned PUT URL allowing the client to upload an image directly to Cloudflare R2 storage without passing bytes through the backend. Content type must be image/jpeg, image/png, or image/webp. If roomType is provided, it must exist in the specified hotel."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Presigned upload URL successfully generated"),
            @ApiResponse(responseCode = "400", description = "Invalid content type or room type does not exist in this hotel"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Admin privileges required"),
            @ApiResponse(responseCode = "404", description = "Hotel not found")
    })
    @PostMapping("/upload-url")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ImageUploadUrlResponse> getUploadUrl(@Valid @RequestBody ImageUploadUrlRequest request) {
        ImageUploadUrlResponse response = imageUploadService.createUploadUrl(request);
        return ResponseEntity.ok(response);
    }
}
