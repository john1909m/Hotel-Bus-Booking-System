package com.spring.boot.repository;

import com.spring.boot.model.BusStop;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;


/**
 * Spring Data JPA repository for BusStop entity.
 */
@Repository
public interface BusStopRepository extends JpaRepository<BusStop, Long> {

    @Query(value = """
                SELECT DISTINCT b FROM BusStop b
                WHERE (:q = '' OR LOWER(b.name) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(b.city) LIKE LOWER(CONCAT('%', :q, '%')))
                  AND (:city = '' OR b.city = :city)
            """,
    countQuery = "SELECT COUNT(DISTINCT b) FROM BusStop b WHERE (:q = '' OR LOWER(b.name) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(b.city) LIKE LOWER(CONCAT('%', :q, '%'))) AND (:city = '' OR b.city = :city)"
    )
    Page<BusStop> findByFilters(@Param("q") String q,
                                @Param("city") String city,
                                Pageable pageable);

    // Lookup for BusStop is needed (hotels, buses, bus stops, routes, trips need it)
    @Query("""
        SELECT b FROM BusStop b
        WHERE (:query = '' OR LOWER(b.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(b.city) LIKE LOWER(CONCAT('%', :query, '%')))
        """)
    Page<BusStop> findByQueryLimit(@Param("query") String query, @Param("pageable") Pageable pageable);
}