package com.spring.boot.controller;

import com.spring.boot.dto.BusFeatureDto;
import com.spring.boot.dto.BusFeatureRequestDto;
import com.spring.boot.service.interfaces.BusFeatureService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing onboard bus features/amenities and their surcharges.
 */
@RestController
@RequestMapping("/api/bus-features")
@AllArgsConstructor
@Tag(name = "Bus Features", description = "Endpoints for managing onboard bus amenities (WiFi, AC, etc.) and surcharges")
public class BusFeatureController {

    private final BusFeatureService busFeatureService;

    @GetMapping
    @Operation(summary = "Get all bus features", description = "Public endpoint listing all configured bus features and their surcharges. Cached with short TTL under family 'bus-features'.")
    public ResponseEntity<List<BusFeatureDto>> getAllFeatures() {
        List<BusFeatureDto> features = busFeatureService.getAllFeatures();
        return ResponseEntity.ok(features);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get bus feature by ID", description = "Public endpoint retrieving details of a single bus feature by ID.")
    public ResponseEntity<BusFeatureDto> getFeatureById(@PathVariable Long id) {
        BusFeatureDto feature = busFeatureService.getFeatureById(id);
        return ResponseEntity.ok(feature);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create bus feature", description = "Admin-only endpoint to create a new onboard feature. Evicts 'bus-features' and 'bus-trips' cache families.")
    public ResponseEntity<BusFeatureDto> createFeature(@Valid @RequestBody BusFeatureRequestDto request) {
        BusFeatureDto created = busFeatureService.createFeature(request);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update bus feature", description = "Admin-only endpoint to update an existing onboard feature and surcharge. Evicts 'bus-features' and 'bus-trips' cache families.")
    public ResponseEntity<BusFeatureDto> updateFeature(@PathVariable Long id, @Valid @RequestBody BusFeatureRequestDto request) {
        BusFeatureDto updated = busFeatureService.updateFeature(id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete bus feature", description = "Admin-only endpoint to delete a bus feature by ID. Evicts 'bus-features' and 'bus-trips' cache families.")
    public ResponseEntity<Void> deleteFeature(@PathVariable Long id) {
        busFeatureService.deleteFeature(id);
        return ResponseEntity.noContent().build();
    }
}
