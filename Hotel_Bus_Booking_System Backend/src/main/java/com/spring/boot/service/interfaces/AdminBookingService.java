package com.spring.boot.service.interfaces;

import com.spring.boot.dto.BookingSummaryDto;
import com.spring.boot.enums.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service interface for admin unified bookings retrieval.
 */
public interface AdminBookingService {

    Page<BookingSummaryDto> getUnifiedBookings(String type, BookingStatus status, Pageable pageable);
}
