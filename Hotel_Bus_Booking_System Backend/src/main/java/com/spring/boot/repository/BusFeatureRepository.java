package com.spring.boot.repository;

import com.spring.boot.model.BusFeature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for BusFeature entity.
 */
@Repository
public interface BusFeatureRepository extends JpaRepository<BusFeature, Long> {

    Optional<BusFeature> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    List<BusFeature> findByActiveTrue();
}
