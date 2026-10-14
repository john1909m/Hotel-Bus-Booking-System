package com.spring.boot.repository;

import com.spring.boot.model.Bus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;


/**
 * Spring Data JPA repository for Bus entity.
 */
@Repository
public interface BusRepository extends JpaRepository<Bus, Long> {

    @Query(value = """
                SELECT DISTINCT b FROM Bus b
                WHERE (:q = '' OR LOWER(b.busNumber) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(b.company) LIKE LOWER(CONCAT('%', :q, '%')))
                  AND (:busType = '' OR b.busType = :busType)
                  AND (:company = '' OR b.company = :company)
            """,
    countQuery = "SELECT COUNT(DISTINCT b) FROM Bus b WHERE (:q = '' OR LOWER(b.busNumber) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(b.company) LIKE LOWER(CONCAT('%', :q, '%'))) AND (:busType = '' OR b.busType = :busType) AND (:company = '' OR b.company = :company)"
    )
    Page<Bus> findByFilters(@Param("q") String q,
                            @Param("busType") String busType,
                            @Param("company") String company,
                            Pageable pageable);

    // Lookup for Bus is needed (hotels, buses, bus stops, routes, trips need it)
    @Query("""
        SELECT b FROM Bus b
        WHERE (:query = '' OR LOWER(b.busNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(b.company) LIKE LOWER(CONCAT('%', :query, '%')))
        """)
    Page<Bus> findByQueryLimit(@Param("query") String query, @Param("pageable") Pageable pageable);
}