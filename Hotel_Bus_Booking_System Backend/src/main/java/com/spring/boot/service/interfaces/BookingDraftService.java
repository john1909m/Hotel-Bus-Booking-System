package com.spring.boot.service.interfaces;

import com.spring.boot.dto.ai.BookingDraftRequest;
import com.spring.boot.dto.ai.BookingDraftResponse;
import com.spring.boot.dto.HotelBookingRequestDto;
import com.spring.boot.dto.BusBookingRequestDto;
import com.spring.boot.dto.PaymentRequestDto;
import com.spring.boot.enums.BookingStatus;
import com.spring.boot.enums.DraftStatus;
import com.spring.boot.exception.*;
import com.spring.boot.model.BookingDraft;
import com.spring.boot.repository.BookingDraftRepository;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

/**
 * Service interface for BookingDraft entity.
 */
public interface BookingDraftService {

    /**
     * Create a new booking draft from the request and user ID.
     * @param userId the user ID from JWT
     * @param request the booking draft request
     * @return the booking draft response
     */
    BookingDraftResponse createDraft(Long userId, BookingDraftRequest request);

    /**
     * Get draft by ID and user ID, verifying ownership.
     * If the draft is expired, mark it as expired and return null (or throw?).
     * @param draftId the draft ID
     * @param userId the user ID
     * @return the booking draft response if found and not expired, else empty
     */
    Optional<BookingDraftResponse> getDraft(Long draftId, Long userId);

    /**
     * Confirm a booking draft, creating the actual bookings and payments.
     * @param userId the user ID from JWT
     * @param draftId the draft ID
     * @param idempotencyKey optional idempotency key
     * @return the booking draft response (which now includes the booking IDs and status)
     */
    BookingDraftResponse confirm(Long userId, Long draftId, String idempotencyKey);

    /**
     * Update an existing draft.
     * @param draft the draft to update
     * @return the updated draft
     */
    BookingDraft updateDraft(BookingDraft draft);

    /**
     * Delete a draft (soft delete).
     * @param id the draft ID
     */
    void deleteDraft(Long id);

    /**
     * Expire old drafts.
     */
    void expireOldDrafts();

    /**
     * Get the booking draft repository.
     * @return the repository
     */
    BookingDraftRepository getBookingDraftRepository();
}