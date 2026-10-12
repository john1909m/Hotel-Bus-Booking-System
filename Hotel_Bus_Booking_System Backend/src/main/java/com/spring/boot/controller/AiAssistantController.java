package com.spring.boot.controller;

import com.spring.boot.dto.UserDto;
import com.spring.boot.dto.ai.AiChatRequest;
import com.spring.boot.dto.ai.AiResponse;
import com.spring.boot.dto.ai.BookingDraftRequest;
import com.spring.boot.service.AiAssistantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for the AI booking assistant.
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiAssistantController {

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
    public ResponseEntity<String> getConversation(@PathVariable String id) {
        Long userId = currentUserId();
        // TODO: load the conversation and verify it belongs to userId
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body("Conversation retrieval not yet implemented");
    }

    /**
     * Create a booking draft from the user's chosen selections.
     */
    @PostMapping("/bookings/drafts")
    public ResponseEntity<String> createBookingDraft(@Valid @RequestBody BookingDraftRequest draftRequest) {
        Long userId = currentUserId();
        // TODO: delegate to the service: create the draft for userId (no reservation yet)
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body("Draft creation not yet implemented");
    }

    /**
     * Get a booking draft by id (owner only).
     */
    @GetMapping("/bookings/drafts/{id}")
    public ResponseEntity<String> getBookingDraft(@PathVariable Long id) {
        Long userId = currentUserId();
        // TODO: load the draft and verify it belongs to userId
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body("Draft retrieval not yet implemented");
    }

    /**
     * Confirm a booking draft (owner only). Supports the Idempotency-Key header.
     */
    @PostMapping("/bookings/drafts/{id}/confirm")
    public ResponseEntity<String> confirmBookingDraft(
            @PathVariable Long id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        Long userId = currentUserId();
        // TODO: re-check availability + price, create the bookings in ONE transaction, honor idempotencyKey
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body("Booking confirmation not yet implemented");
    }

    /**
     * The user always comes from the security context (JWT), never from the request.
     */
    private Long currentUserId() {
        UserDto user = (UserDto) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return user.getId();
    }
}