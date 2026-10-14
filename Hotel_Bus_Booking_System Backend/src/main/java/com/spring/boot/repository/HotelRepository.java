package com.spring.boot.repository;

import com.spring.boot.model.Hotel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;


/**
 * Spring Data JPA repository for Hotel entity.
 */
@Repository
public interface HotelRepository extends JpaRepository<Hotel, Long> {

    // Simple derived queries for filtering
    Page<Hotel> findByNameContainingIgnoreCase(String name, Pageable pageable);
    Page<Hotel> findByCityIgnoreCase(String city, Pageable pageable);
    Page<Hotel> findByRatingGreaterThanEqual(Double minRating, Pageable pageable);

    // Lookup for Hotel is needed (hotels, buses, bus stops, routes, trips need it)
    @Query("""
        SELECT h FROM Hotel h
        WHERE (:query = '' OR LOWER(h.name) LIKE LOWER(CONCAT('%', :query, '%'))
              OR LOWER(h.description) LIKE LOWER(CONCAT('%', :query, '%'))
              OR LOWER(h.address) LIKE LOWER(CONCAT('%', :query, '%'))
              OR LOWER(h.city) LIKE LOWER(CONCAT('%', :query, '%')))
        """)
    Page<Hotel> findByQueryLimit(@Param("query") String query, @Param("pageable") Pageable pageable);


    Page<Hotel> findAll(Specification<Hotel> spec, Pageable pageable);
}