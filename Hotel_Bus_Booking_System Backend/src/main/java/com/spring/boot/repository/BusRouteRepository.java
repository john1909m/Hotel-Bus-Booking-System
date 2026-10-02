package com.spring.boot.repository;

import com.spring.boot.model.BusRoute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for BusRoute entity.
 */
@Repository
public interface BusRouteRepository extends JpaRepository<BusRoute, Long> {
}