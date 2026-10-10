package com.spring.boot.controller;

import com.spring.boot.dto.AuthResponse;
import com.spring.boot.dto.LoginRequest;
import com.spring.boot.dto.RegisterRequest;
import com.spring.boot.dto.UserDto;
import com.spring.boot.service.interfaces.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.SystemException;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for authentication operations.
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5174/")
public class AuthController {

    @Autowired
    private AuthService authService;


    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@RequestBody @Valid RegisterRequest registerRequest) throws SystemException {
        AuthResponse authResponse = authService.signUp(registerRequest);
        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody @Valid LoginRequest loginRequest, HttpServletResponse response) throws SystemException {
        return ResponseEntity.ok(authService.login(loginRequest, response));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UserDto user = (UserDto) authentication.getPrincipal();
        return ResponseEntity.ok(user);
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(HttpServletRequest request,
                                         HttpServletResponse response) {

        authService.logout(request, response);
        return ResponseEntity.ok("Logged.out.successfully");
    }
}