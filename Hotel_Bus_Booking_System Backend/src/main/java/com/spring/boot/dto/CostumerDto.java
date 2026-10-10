package com.spring.boot.dto;

import com.spring.boot.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Data Transfer Object for Costumer entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CostumerDto {

    private Long id;
    private String name;
    private String email;
    private String phoneNumber;
    private Role role;
}