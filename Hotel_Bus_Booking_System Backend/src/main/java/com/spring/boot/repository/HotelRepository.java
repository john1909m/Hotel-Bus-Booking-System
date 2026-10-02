package com.spring.boot.repository;

import com.spring.boot.model.Hotel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for Hotel entity.
 */
@Repository
public interface HotelRepository extends JpaRepository<Hotel, Long> {
}