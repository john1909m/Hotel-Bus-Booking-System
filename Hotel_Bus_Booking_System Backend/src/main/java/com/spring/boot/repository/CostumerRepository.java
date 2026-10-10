package com.spring.boot.repository;

import com.spring.boot.model.Costumer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for Costumer entity.
 */
@Repository
public interface CostumerRepository extends JpaRepository<Costumer, Long> {

    Costumer findByEmail(String email);

    boolean existsByEmail(String email);
}