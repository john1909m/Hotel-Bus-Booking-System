package com.spring.boot.service.interfaces;

import com.spring.boot.model.BookingDraft;
import com.spring.boot.repository.BookingDraftRepository;

import java.util.Optional;

/**
 * Service interface for BookingDraft entity.
 */
public interface BookingDraftService {

    /**
     * Create a new booking draft.
     */
    BookingDraft createDraft(BookingDraft draft);

    /**
     * Get draft by ID, verifying ownership.
     */
    Optional<BookingDraft> getDraftById(Long id, Long userId);

    /**
     * Get active draft for a user.
     */
    Optional<BookingDraft> getActiveDraftForUser(Long userId);

    /**
     * Update an existing draft.
     */
    BookingDraft updateDraft(BookingDraft draft);

    /**
     * Delete a draft (soft delete).
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