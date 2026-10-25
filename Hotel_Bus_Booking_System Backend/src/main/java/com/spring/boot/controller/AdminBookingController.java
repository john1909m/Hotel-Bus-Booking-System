package com.spring.boot.controller;

import com.spring.boot.dto.BookingSummaryDto;
import com.spring.boot.enums.BookingStatus;
import com.spring.boot.service.interfaces.AdminBookingService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.AllArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller for unified admin booking management.
 */
@RestController
@RequestMapping("/api/admin/bookings")
@AllArgsConstructor
public class AdminBookingController {

    private final AdminBookingService adminBookingService;

    @Operation(summary = "Get unified booking list (Hotel or Bus)",
               description = "Admin only. Returns paginated bookings. Parameter 'type' accepts HOTEL or BUS (defaults to HOTEL when absent, guaranteeing database-level pagination and sorting without in-memory merge).")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PagedModel<BookingSummaryDto>> getUnifiedBookings(
            @RequestParam(required = false, defaultValue = "HOTEL") String type,
            @RequestParam(required = false) BookingStatus status,
            @ParameterObject Pageable pageable) {

        Page<BookingSummaryDto> page = adminBookingService.getUnifiedBookings(type, status, pageable);
        return ResponseEntity.ok(new PagedModel<>(page));
    }
}
