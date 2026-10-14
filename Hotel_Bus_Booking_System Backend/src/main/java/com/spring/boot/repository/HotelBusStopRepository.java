package com.spring.boot.repository;

import com.spring.boot.model.HotelBusStop;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;


/**
 * Spring Data JPA repository for HotelBusStop entity.
 */
@Repository
public interface HotelBusStopRepository extends JpaRepository<HotelBusStop, Long> {

    List<HotelBusStop> findByHotelId(Long hotelId);

    List<HotelBusStop> findByBusStopId(Long busStopId);

    @Query("""
        SELECT h FROM HotelBusStop h
        WHERE (:q = '' OR LOWER(h.hotel.name) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(h.busStop.name) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(CAST(h.distance AS string)) LIKE LOWER(CONCAT('%', :q, '%')))
          AND (:hotelId = 0 OR h.hotel.id = :hotelId)
          AND (:busStopId = 0 OR h.busStop.id = :busStopId)
        """)
    Page<HotelBusStop> findByFilters(@Param("q") String q,
                                     @Param("hotelId") Long hotelId,
                                     @Param("busStopId") Long busStopId,
                                     Pageable pageable);

    // Lookup for HotelBusStop is NOT needed (only hotels, buses, bus stops, routes, trips need it) - removed
    @Query("""
        SELECT h FROM HotelBusStop h
        WHERE (LOWER(h.hotel.name) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(h.busStop.name) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(CAST(h.distance AS string)) LIKE LOWER(CONCAT('%', :query, '%')))
        ORDER BY h.id DESC
        """)
    Page<HotelBusStop> findByQueryLimit(@Param("query") String query, @Param("pageable") Pageable pageable);
}