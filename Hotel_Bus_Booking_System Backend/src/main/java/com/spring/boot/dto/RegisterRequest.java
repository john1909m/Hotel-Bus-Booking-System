package com.spring.boot.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for user registration.
 */
public class RegisterRequest {

    @NotBlank(message = "NotBlank.name")
    private String name;

    @NotBlank(message = "NotBlank.email")
    @Email(message = "NotBlank.email")
    private String email;

    @NotBlank(message = "NotBlank.password")
    @Size(min = 8, message = "Size.password")
    private String password;

    @NotBlank(message = "NotBlank.phoneNumber")
    @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Pattern.phoneNumber")
    private String phoneNumber;

    // Getters and Setters
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

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }
}