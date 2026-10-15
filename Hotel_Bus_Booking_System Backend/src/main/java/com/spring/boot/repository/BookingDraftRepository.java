package com.spring.boot.repository;

import com.spring.boot.enums.DraftStatus;
import com.spring.boot.model.BookingDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for BookingDraft entity.
 */
@Repository
public interface BookingDraftRepository extends JpaRepository<BookingDraft, Long> {

    /**
     * Find active draft for a user (not expired or confirmed).
     */
    Optional<BookingDraft> findByUserIdAndStatusIn(Long userId, java.util.List<DraftStatus> statuses);

    /**
     * Find draft by ID and user ID (for ownership verification).
     */
    Optional<BookingDraft> findByIdAndUserId(Long id, Long userId);

    /**
     * Find draft by ID and user ID with pessimistic write lock (for confirming).
     */
    @Query("SELECT b FROM BookingDraft b WHERE b.id = ?1 AND b.userId = ?2")
    @Lock(value = LockModeType.PESSIMISTIC_WRITE)
    Optional<BookingDraft> findByIdAndUserIdForUpdate(Long id, Long userId);

    /**
     * Find expired drafts.
     */
    java.util.List<BookingDraft> findByExpiresAtBeforeAndStatusIn(LocalDateTime now, java.util.List<DraftStatus> statuses);
}