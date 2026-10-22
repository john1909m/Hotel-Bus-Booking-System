package com.spring.boot.repository;

import org.springframework.data.jpa.domain.Specification;
import com.spring.boot.model.Hotel;
import com.spring.boot.model.Room;

import jakarta.persistence.criteria.*;
import java.util.*;

public class HotelSpecification {

    public static Specification<Hotel> withFilters(String q, String city, Double minRating, Double maxPrice) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Text search on name or city (q parameter)
            if (q != null && !q.trim().isEmpty()) {
                String likePattern = "%" + q.trim().toLowerCase() + "%";
                Predicate nameOrCityPredicate = cb.or(
                        cb.like(cb.lower(root.get("name")), likePattern),
                        cb.like(cb.lower(root.get("city")), likePattern)
                );
                predicates.add(nameOrCityPredicate);
            }

            // City filter
            if (city != null && !city.trim().isEmpty()) {
                predicates.add(cb.equal(cb.lower(root.get("city")), city.trim().toLowerCase()));
            }

            // Minimum rating filter
            if (minRating != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("rating"), minRating));
            }

            // Maximum price filter using EXISTS subquery on rooms
            if (maxPrice != null) {
                Subquery<Room> roomSubquery = query.subquery(Room.class);
                Root<Room> roomRoot = roomSubquery.from(Room.class);
                roomSubquery.select(roomRoot.get("hotel"))
                        .where(cb.equal(roomRoot.get("hotel"), root),
                               cb.lessThanOrEqualTo(roomRoot.get("pricePerNight"), maxPrice))
                        .groupBy(roomRoot.get("hotel"))
                        .having(cb.lessThanOrEqualTo(cb.min(roomRoot.get("pricePerNight")), maxPrice));

                predicates.add(cb.exists(roomSubquery));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}