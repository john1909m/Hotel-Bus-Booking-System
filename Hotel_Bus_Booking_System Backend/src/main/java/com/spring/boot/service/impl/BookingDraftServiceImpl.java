package com.spring.boot.service.impl;

import com.spring.boot.exception.DraftExpiredException;
import com.spring.boot.exception.DraftNotFoundException;
import com.spring.boot.model.BookingDraft;
import com.spring.boot.enums.DraftStatus;
import com.spring.boot.repository.BookingDraftRepository;
import com.spring.boot.service.interfaces.BookingDraftService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Service implementation for BookingDraft entity.
 */
@Service
@AllArgsConstructor
public class BookingDraftServiceImpl implements BookingDraftService {

    private final BookingDraftRepository bookingDraftRepository;

    @Override
    public BookingDraft createDraft(BookingDraft draft) {
        return bookingDraftRepository.save(draft);
    }

    @Override
    public Optional<BookingDraft> getDraftById(Long id, Long userId) {
        Optional<BookingDraft> draftOpt = bookingDraftRepository.findByIdAndUserId(id, userId);
        if (draftOpt.isPresent()) {
            BookingDraft draft = draftOpt.get();
            // Check if draft is expired
            if (draft.getExpiresAt().isBefore(LocalDateTime.now()) &&
                draft.getStatus() == DraftStatus.CREATED) {
                draft.setStatus(DraftStatus.EXPIRED);
                bookingDraftRepository.save(draft);
                throw new DraftExpiredException("Booking draft has expired");
            }
            if (draft.getStatus() != DraftStatus.CREATED) {
                throw new DraftNotFoundException("Booking draft is not active");
            }
            return draftOpt;
        }
        return Optional.empty();
    }

    @Override
    public Optional<BookingDraft> getActiveDraftForUser(Long userId) {
        return bookingDraftRepository.findByUserIdAndStatusIn(
                userId,
                List.of(DraftStatus.CREATED)
        ).map(draft -> {
            // Check if draft is expired
            if (draft.getExpiresAt().isBefore(LocalDateTime.now()) &&
                draft.getStatus() == DraftStatus.CREATED) {
                draft.setStatus(DraftStatus.EXPIRED);
                bookingDraftRepository.save(draft);
                throw new DraftExpiredException("Booking draft has expired");
            }
            return draft;
        });
    }

    @Override
    public BookingDraft updateDraft(BookingDraft draft) {
        // Check if draft exists and is active
        Optional<BookingDraft> existingDraft = getDraftById(draft.getId(), draft.getUserId());
        if (existingDraft.isEmpty()) {
            throw new DraftNotFoundException("Booking draft not found or not active");
        }
        return bookingDraftRepository.save(draft);
    }

    @Override
    public void deleteDraft(Long id) {
        // We don't have userId here, so we can't verify ownership
        // In a real implementation, we would need to pass userId or check ownership differently
        bookingDraftRepository.deleteById(id);
    }

    @Override
    public void expireOldDrafts() {
        LocalDateTime now = LocalDateTime.now();
        List<BookingDraft> expiredDrafts = bookingDraftRepository.findByExpiresAtBeforeAndStatusIn(
                now,
                List.of(DraftStatus.CREATED)
        );

        for (BookingDraft draft : expiredDrafts) {
            draft.setStatus(DraftStatus.EXPIRED);
            bookingDraftRepository.save(draft);
        }
    }

    @Override
    public BookingDraftRepository getBookingDraftRepository() {
        return bookingDraftRepository;
    }
}