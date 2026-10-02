package com.spring.boot.repository;

import com.spring.boot.model.BusStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for BusStop entity.
 */
@Repository
public interface BusStopRepository extends JpaRepository<BusStop, Long> {
}