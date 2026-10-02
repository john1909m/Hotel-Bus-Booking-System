package com.spring.boot.repository;

import com.spring.boot.model.HotelBusStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for HotelBusStop entity.
 */
@Repository
public interface HotelBusStopRepository extends JpaRepository<HotelBusStop, Long> {

    List<HotelBusStop> findByHotelId(Long hotelId);

    List<HotelBusStop> findByBusStopId(Long busStopId);
}