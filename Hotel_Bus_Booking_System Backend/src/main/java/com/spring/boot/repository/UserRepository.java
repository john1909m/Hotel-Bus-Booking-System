package com.spring.boot.repository;

import com.spring.boot.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;


/**
 * Spring Data JPA repository for User entity.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    User findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("""
        SELECT u FROM User u
        WHERE (:q = '' OR LOWER(u.name) LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%')))
          AND (:role = '' OR u.role = :role)
        """)
    Page<User> findByFilters(@Param("q") String q,
                             @Param("role") String role,
                             Pageable pageable);

    // Lookup for User is NOT needed (only hotels, buses, bus stops, routes, trips need it) - removed
}