package com.spring.boot.controller;

import com.spring.boot.enums.BookingStatus;
import com.spring.boot.enums.BusTripStatus;
import com.spring.boot.enums.PaymentStatus;
import com.spring.boot.enums.Role;
import com.spring.boot.enums.RoomType;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller providing system metadata, enums, and valid state transitions for UI components.
 */
@RestController
@RequestMapping("/api/meta")
public class MetaController {

    @Operation(summary = "Get enum values and allowed transitions",
               description = "Returns allowed values and state transition rules for status dropdowns and UI forms.")
    @GetMapping("/enums")
    public ResponseEntity<Map<String, Object>> getEnums() {
        Map<String, Object> response = new LinkedHashMap<>();

        // Booking status and transitions
        Map<String, Object> bookingStatus = new LinkedHashMap<>();
        bookingStatus.put("values", List.of(BookingStatus.PENDING.name(), BookingStatus.CONFIRMED.name(), BookingStatus.COMPLETED.name(), BookingStatus.CANCELLED.name()));
        Map<String, List<String>> bookingTransitions = new LinkedHashMap<>();
        bookingTransitions.put(BookingStatus.PENDING.name(), List.of(BookingStatus.CONFIRMED.name(), BookingStatus.CANCELLED.name()));
        bookingTransitions.put(BookingStatus.CONFIRMED.name(), List.of(BookingStatus.COMPLETED.name(), BookingStatus.CANCELLED.name()));
        bookingTransitions.put(BookingStatus.COMPLETED.name(), List.of());
        bookingTransitions.put(BookingStatus.CANCELLED.name(), List.of());
        bookingStatus.put("transitions", bookingTransitions);
        response.put("bookingStatus", bookingStatus);

        // Bus trip status and transitions
        Map<String, Object> busTripStatus = new LinkedHashMap<>();
        busTripStatus.put("values", List.of(BusTripStatus.SCHEDULED.name(), BusTripStatus.DEPARTED.name(), BusTripStatus.ARRIVED.name(), BusTripStatus.CANCELLED.name()));
        Map<String, List<String>> busTripTransitions = new LinkedHashMap<>();
        busTripTransitions.put(BusTripStatus.SCHEDULED.name(), List.of(BusTripStatus.DEPARTED.name(), BusTripStatus.CANCELLED.name()));
        busTripTransitions.put(BusTripStatus.DEPARTED.name(), List.of(BusTripStatus.ARRIVED.name(), BusTripStatus.CANCELLED.name()));
        busTripTransitions.put(BusTripStatus.ARRIVED.name(), List.of());
        busTripTransitions.put(BusTripStatus.CANCELLED.name(), List.of());
        busTripStatus.put("transitions", busTripTransitions);
        response.put("busTripStatus", busTripStatus);

        // Payment status
        response.put("paymentStatus", Map.of("values", Arrays.stream(PaymentStatus.values()).map(Enum::name).toList()));

        // Room type
        response.put("roomType", Map.of("values", Arrays.stream(RoomType.values()).map(Enum::name).toList()));

        // Role
        response.put("role", Map.of("values", Arrays.stream(Role.values()).map(Enum::name).toList()));

        return ResponseEntity.ok(response);
    }
}
