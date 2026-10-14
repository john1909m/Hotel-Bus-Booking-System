package com.spring.boot.repository;

import com.spring.boot.model.BusRoute;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;


/**
 * Spring Data JPA repository for BusRoute entity.
 */
@Repository
public interface BusRouteRepository extends JpaRepository<BusRoute, Long> {

    @Query(value = """
                SELECT DISTINCT br FROM BusRoute br
                WHERE (:originStopId = 0 OR br.originStop.id = :originStopId)
                  AND (:destinationStopId = 0 OR br.destinationStop.id = :destinationStopId)
            """,
    countQuery = "SELECT COUNT(DISTINCT br) FROM BusRoute br WHERE (:originStopId = 0 OR br.originStop.id = :originStopId) AND (:destinationStopId = 0 OR br.destinationStop.id = :destinationStopId)"
    )
    Page<BusRoute> findByFilters(@Param("originStopId") Long originStopId,
                                 @Param("destinationStopId") Long destinationStopId,
                                 Pageable pageable);

    // Lookup for BusRoute is needed (hotels, buses, bus stops, routes, trips need it)
    @Query("""
        SELECT br FROM BusRoute br
        WHERE (:query = '' OR LOWER(br.name) LIKE LOWER(CONCAT('%', :query, '%')))
        """)
    Page<BusRoute> findByQueryLimit(@Param("query") String query, @Param("pageable") Pageable pageable);
}