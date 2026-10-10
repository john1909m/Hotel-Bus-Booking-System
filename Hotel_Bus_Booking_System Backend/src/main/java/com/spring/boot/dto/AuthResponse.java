package com.spring.boot.dto;

import com.spring.boot.enums.Role;

/**
 * Response DTO for authentication operations.
 */
public class AuthResponse {

    private String token;
    private String tokenType = "Bearer";
    private Long expiresIn; // in seconds
    private Long id;
    private String name;
    private String email;
    private String phoneNumber;
    private Role role;

    // Constructors
    public AuthResponse() {
    }

    public AuthResponse(String token, Long expiresIn, Long id, String name, String email, String phoneNumber, Role role) {
        this.token = token;
        this.expiresIn = expiresIn;
        this.id = id;
        this.name = name;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.role = role;
    }

    // Getters and Setters
    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getTokenType() {
        return tokenType;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public Long getExpiresIn() {
        return expiresIn;
    }

    public void setExpiresIn(Long expiresIn) {
        this.expiresIn = expiresIn;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }
}