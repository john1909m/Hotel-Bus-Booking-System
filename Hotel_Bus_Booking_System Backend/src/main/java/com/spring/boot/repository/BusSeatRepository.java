package com.spring.boot.repository;

import com.spring.boot.model.BusSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for BusSeat entity.
 */
@Repository
public interface BusSeatRepository extends JpaRepository<BusSeat, Long> {

    List<BusSeat> findByBusId(Long busId);
}