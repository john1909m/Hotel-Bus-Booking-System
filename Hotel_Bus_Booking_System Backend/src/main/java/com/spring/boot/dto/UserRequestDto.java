package com.spring.boot.dto;

import com.spring.boot.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request Data Transfer Object for User entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserRequestDto {

    private String name;


    private String email;

    private String password;

    private String phoneNumber;

    private Role role;
}