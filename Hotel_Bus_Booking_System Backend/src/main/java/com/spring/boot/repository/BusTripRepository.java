package com.spring.boot.repository;

import com.spring.boot.model.BusTrip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for BusTrip entity.
 */
@Repository
public interface BusTripRepository extends JpaRepository<BusTrip, Long> {

    List<BusTrip> findByBusId(Long busId);

    List<BusTrip> findByRouteId(Long routeId);
}