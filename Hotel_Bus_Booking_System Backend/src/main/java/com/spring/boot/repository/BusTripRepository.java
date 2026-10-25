package com.spring.boot.repository;

import com.spring.boot.enums.BusTripStatus;
import com.spring.boot.model.BusTrip;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for BusTrip entity.
 */
@Repository
public interface BusTripRepository extends JpaRepository<BusTrip, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT bt FROM BusTrip bt WHERE bt.id = :id")
    Optional<BusTrip> findByIdForUpdate(@Param("id") Long id);

    @EntityGraph(attributePaths = {"bus", "route", "route.originStop", "route.destinationStop"})
    List<BusTrip> findByBusId(Long busId);

    @EntityGraph(attributePaths = {"bus", "route", "route.originStop", "route.destinationStop"})
    List<BusTrip> findByRouteId(Long routeId);

    @EntityGraph(attributePaths = {"bus", "route", "route.originStop", "route.destinationStop"})
    @Query(value = """
                SELECT DISTINCT bt FROM BusTrip bt
                WHERE (:busId = 0 OR bt.bus.id = :busId)
                  AND (:routeId = 0 OR bt.route.id = :routeId)
                  AND (:status = 'ANY' OR bt.status = :status)
                  AND (bt.departureTime >= COALESCE(:departureAfter, bt.departureTime))
                  AND (bt.departureTime <= COALESCE(:departureBefore, bt.departureTime))
            """,
    countQuery = "SELECT COUNT(DISTINCT bt) FROM BusTrip bt WHERE (:busId = 0 OR bt.bus.id = :busId) AND (:routeId = 0 OR bt.route.id = :routeId) AND (:status = 'ANY' OR bt.status = :status) AND (bt.departureTime >= COALESCE(:departureAfter, bt.departureTime)) AND (bt.departureTime <= COALESCE(:departureBefore, bt.departureTime))"
    )
    Page<BusTrip> findByFilters(@Param("busId") Long busId,
                                @Param("routeId") Long routeId,
                                @Param("status") BusTripStatus status,
                                @Param("departureAfter") LocalDateTime departureAfter,
                                @Param("departureBefore") LocalDateTime departureBefore,
                                Pageable pageable);

    // Lookup for BusTrip is needed (hotels, buses, bus stops, routes, trips need it)
    @EntityGraph(attributePaths = {"bus", "route"})
    @Query("""
        SELECT bt FROM BusTrip bt
        WHERE (:query = '' OR LOWER(CAST(bt.id AS string)) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(CAST(bt.bus.id AS string)) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(CAST(bt.route.id AS string)) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(CAST(bt.departureTime AS string)) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(CAST(bt.arrivalTime AS string)) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(CAST(bt.price AS string)) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(bt.status) LIKE LOWER(CONCAT('%', :query, '%')))
        """)
    Page<BusTrip> findByQueryLimit(@Param("query") String query, @Param("pageable") Pageable pageable);

    @EntityGraph(attributePaths = {"bus", "route", "route.originStop", "route.destinationStop"})
    @Query("""
        SELECT bt FROM BusTrip bt
        JOIN bt.route r
        JOIN r.originStop os
        JOIN r.destinationStop ds
        WHERE (:originCity IS NULL OR LOWER(os.city) LIKE LOWER(CONCAT('%', :originCity, '%')))
          AND (:destinationCity IS NULL OR LOWER(ds.city) LIKE LOWER(CONCAT('%', :destinationCity, '%')))
          AND (bt.departureTime >= COALESCE(:departureAfter, bt.departureTime))
          AND (bt.departureTime <= COALESCE(:departureBefore, bt.departureTime))
        ORDER BY bt.departureTime ASC
    """)
    List<BusTrip> findTripsByCities(
            @Param("originCity") String originCity,
            @Param("destinationCity") String destinationCity,
            @Param("departureAfter") LocalDateTime departureAfter,
            @Param("departureBefore") LocalDateTime departureBefore,
            Pageable pageable);
}