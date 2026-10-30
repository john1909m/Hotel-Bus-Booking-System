package com.spring.boot.controller;

import com.spring.boot.dto.UserDto;
import com.spring.boot.dto.ai.AiChatRequest;
import com.spring.boot.dto.ai.AiResponse;
import com.spring.boot.dto.ai.AiMessageDto;
import com.spring.boot.dto.ai.BookingDraftRequest;
import com.spring.boot.dto.ai.BookingDraftResponse;
import com.spring.boot.service.AiAssistantService;
import com.spring.boot.service.interfaces.BookingDraftService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for the AI booking assistant.
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiAssistantController {

    private final BookingDraftService bookingDraftService;
    private final AiAssistantService aiAssistantService;

    /**
     * Process a message with the AI assistant.
     */
    @PostMapping("/chat")
    public ResponseEntity<AiResponse> chat(@Valid @RequestBody AiChatRequest request) {
        Long userId = currentUserId();

        String conversationId = (request.conversationId() == null || request.conversationId().isBlank())
                ? UUID.randomUUID().toString()
                : request.conversationId();

        AiResponse response = aiAssistantService.processMessage(conversationId, request.message(), userId);
        return ResponseEntity.ok(response);
    }

    /**
     * Get a conversation by id (owner only).
     */
    @GetMapping("/conversations/{id}")
    public ResponseEntity<List<AiMessageDto>> getConversation(@PathVariable String id) {
        return ResponseEntity.ok(aiAssistantService.getConversation(id, currentUserId()));
    }

    /**
     * Create a booking draft from the user's chosen selections.
     */
    @io.swagger.v3.oas.annotations.Operation(
            summary = "Create a booking draft",
            description = "Creates a draft reservation for multiple hotel rooms (up to 10 in the same hotel) and optional bus transport seats. " +
                    "Room capacity rule: children under 12 do not count towards hotel room capacity. " +
                    "Bus transport rule: the number of seats per direction must equal the number of transport passengers, " +
                    "and transport passengers must not exceed total hotel guests (adults + all children). " +
                    "Children under 12 still occupy a seat on the bus and must be counted."
    )
    @PostMapping("/bookings/drafts")
    public ResponseEntity<BookingDraftResponse> createBookingDraft(@Valid @RequestBody BookingDraftRequest draftRequest) {
        Long userId = currentUserId();
        BookingDraftResponse response = bookingDraftService.createDraft(userId, draftRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Get a booking draft by id (owner only).
     */
    @GetMapping("/bookings/drafts/{id}")
    public ResponseEntity<BookingDraftResponse> getBookingDraft(@PathVariable Long id) {
        Long userId = currentUserId();
        return bookingDraftService.getDraft(id, userId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Confirm a booking draft (owner only). Supports the Idempotency-Key header.
     */
    @PostMapping("/bookings/drafts/{id}/confirm")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<BookingDraftResponse> confirmBookingDraft(
            @PathVariable Long id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        Long userId = currentUserId();
        BookingDraftResponse response = bookingDraftService.confirm(userId, id, idempotencyKey);
        return ResponseEntity.ok(response);
    }

    /**
     * The user always comes from the security context (JWT), never from the request.
     */
    private Long currentUserId() {
        UserDto user = (UserDto) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return user.getId();
    }
}