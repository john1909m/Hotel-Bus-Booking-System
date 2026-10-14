package com.spring.boot.repository.spec;

import com.spring.boot.enums.BookingStatus;
import com.spring.boot.model.BusBooking;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public final class BusBookingSpecs {

    private BusBookingSpecs() {}

    public static Specification<BusBooking> filter(BookingStatus status,
                                                   LocalDate bookingDateAfter,
                                                   LocalDate bookingDateBefore,
                                                   Long userId,
                                                   Long busTripId,
                                                   Long seatId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (bookingDateAfter != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.<LocalDate>get("bookingDate"), bookingDateAfter));
            }
            if (bookingDateBefore != null) {
                predicates.add(cb.lessThanOrEqualTo(root.<LocalDate>get("bookingDate"), bookingDateBefore));
            }
            if (userId != null) {
                predicates.add(cb.equal(root.get("user").get("id"), userId));
            }
            if (busTripId != null) {
                predicates.add(cb.equal(root.get("busTrip").get("id"), busTripId));
            }
            if (seatId != null) {
                predicates.add(cb.equal(root.get("seat").get("id"), seatId));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}