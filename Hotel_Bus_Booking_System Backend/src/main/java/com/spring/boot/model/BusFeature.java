package com.spring.boot.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * BusFeature entity representing an onboard amenity/feature (e.g., WIFI, AC, CHARGER).
 */
@Entity
@Table(name = "bus_features")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@lombok.Builder
public class BusFeature extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "name_key", nullable = false)
    private String nameKey;

    @Column(name = "surcharge", nullable = false, precision = 10, scale = 2)
    @lombok.Builder.Default
    private BigDecimal surcharge = BigDecimal.ZERO;

    @Column(name = "active", nullable = false)
    @lombok.Builder.Default
    private boolean active = true;
}
