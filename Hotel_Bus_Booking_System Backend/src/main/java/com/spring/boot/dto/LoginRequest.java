package com.spring.boot.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for user login.
 */
public class LoginRequest {

    @NotBlank(message = "NotBlank.email")
    @Email(message = "NotBlank.email")
    private String email;

    @NotBlank(message = "NotBlank.password")
    private String password;

    // Getters and Setters
    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}