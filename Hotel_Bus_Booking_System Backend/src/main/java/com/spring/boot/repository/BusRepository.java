package com.spring.boot.repository;

import com.spring.boot.model.Bus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for Bus entity.
 */
@Repository
public interface BusRepository extends JpaRepository<Bus, Long> {
}