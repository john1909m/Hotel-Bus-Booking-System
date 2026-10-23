package com.spring.boot.controller;

import com.spring.boot.dto.HotelImageDto;
import com.spring.boot.dto.HotelImageRequest;
import com.spring.boot.service.interfaces.HotelImageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing hotel gallery images.
 */
@RestController
@AllArgsConstructor
@Tag(name = "Hotel Images", description = "Endpoints for managing hotel-level and room-type gallery images")
public class HotelImageController {

    private final HotelImageService hotelImageService;

    @Operation(
            summary = "Add an image to a hotel gallery (Admin only)",
            description = "Creates a gallery image for a hotel. If roomType is omitted or null, the image is hotel-level (e.g., lobby, exterior). If roomType is provided, it must match an existing room type in this hotel. The url must be HTTPS and its host must belong to the allowed hosts allowlist configured in app.images.allowed-hosts."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Image successfully created"),
            @ApiResponse(responseCode = "400", description = "Invalid URL (non-HTTPS, userinfo/non-443 port present, disallowed host) or non-existent room type for this hotel"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Admin privileges required"),
            @ApiResponse(responseCode = "404", description = "Hotel not found")
    })
    @PostMapping("/api/hotels/{hotelId}/images")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<HotelImageDto> addImage(
            @Parameter(description = "ID of the hotel", required = true) @PathVariable Long hotelId,
            @Valid @RequestBody HotelImageRequest request) {
        HotelImageDto created = hotelImageService.addImage(hotelId, request);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @Operation(
            summary = "Get images for a hotel (Public)",
            description = "Retrieves images for the specified hotel ordered by sortOrder ascending, then ID ascending. If roomType is provided, only images matching that room type for this hotel are returned. If roomType is omitted, all hotel-level and room-level images are returned."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of hotel images returned"),
            @ApiResponse(responseCode = "404", description = "Hotel not found")
    })
    @GetMapping("/api/hotels/{hotelId}/images")
    public ResponseEntity<List<HotelImageDto>> getImages(
            @Parameter(description = "ID of the hotel", required = true) @PathVariable Long hotelId,
            @Parameter(description = "Optional room type filter (e.g., SINGLE, DOUBLE, SUITE, DELUXE)") @RequestParam(required = false) String roomType) {
        List<HotelImageDto> images = hotelImageService.getImages(hotelId, roomType);
        return ResponseEntity.ok(images);
    }

    @Operation(
            summary = "Update a hotel image (Admin only)",
            description = "Updates an existing hotel image URL, room type, and sort order. URL must be HTTPS from an allowed host, and room type (if provided) must exist in the hotel."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Image successfully updated"),
            @ApiResponse(responseCode = "400", description = "Invalid URL or room type does not exist in this hotel"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Admin privileges required"),
            @ApiResponse(responseCode = "404", description = "Image not found")
    })
    @PutMapping("/api/hotel-images/{imageId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<HotelImageDto> updateImage(
            @Parameter(description = "ID of the image to update", required = true) @PathVariable Long imageId,
            @Valid @RequestBody HotelImageRequest request) {
        HotelImageDto updated = hotelImageService.updateImage(imageId, request);
        return ResponseEntity.ok(updated);
    }

    @Operation(
            summary = "Delete a hotel image (Admin only)",
            description = "Deletes a hotel image by its ID."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Image successfully deleted"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Admin privileges required"),
            @ApiResponse(responseCode = "404", description = "Image not found")
    })
    @DeleteMapping("/api/hotel-images/{imageId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteImage(
            @Parameter(description = "ID of the image to delete", required = true) @PathVariable Long imageId) {
        hotelImageService.deleteImage(imageId);
        return ResponseEntity.noContent().build();
    }
}
