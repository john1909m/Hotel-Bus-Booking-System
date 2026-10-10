package com.spring.boot.service.impl;

import com.spring.boot.config.jwt.TokenHandler;
import com.spring.boot.dto.AuthResponse;
import com.spring.boot.dto.LoginRequest;
import com.spring.boot.dto.RegisterRequest;
import com.spring.boot.dto.UserDto;
import com.spring.boot.exception.AuthenticationException;
import com.spring.boot.mapper.UserMapper;
import com.spring.boot.model.User;
import com.spring.boot.repository.UserRepository;
import com.spring.boot.service.interfaces.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Implementation of authentication service.
 */
@Service
public class AuthServiceImpl implements AuthService {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private TokenHandler tokenHandler;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public AuthResponse signUp(RegisterRequest registerRequest) throws AuthenticationException {
        // Check if email already exists
        if (userRepo.existsByEmail(registerRequest.getEmail())) {
            throw new AuthenticationException("Email.already.exists");
        }

        // Create user entity from register request
        User user = new User();
        user.setName(registerRequest.getName());
        user.setEmail(registerRequest.getEmail());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        user.setPhoneNumber(registerRequest.getPhoneNumber());
        // Set role to USER (customer) by default, not from request to prevent privilege escalation
        user.setRole(com.spring.boot.enums.Role.USER);

        // Save user
        User savedUser = userRepo.save(user);

        // Create token and auth response
        UserDto userDto = userMapper.userToUserDto(savedUser);
        String token = tokenHandler.createToken(userDto);

        // Set expiration time (same as in TokenHandler)
        long expirationTimeSeconds = tokenHandler.getTime().getSeconds();

        return new AuthResponse(
                token,
                expirationTimeSeconds,
                savedUser.getId(),
                savedUser.getName(),
                savedUser.getEmail(),
                savedUser.getPhoneNumber(),
                savedUser.getRole()
        );
    }

    @Override
    public AuthResponse login(LoginRequest loginRequest, HttpServletResponse response) throws AuthenticationException {
        // Find user by email
        User user = userRepo.findByEmail(loginRequest.getEmail());
//                .orElseThrow(() -> new AuthenticationException("Bad.credentials"));

        // Check password
        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            throw new AuthenticationException("Bad.credentials");
        }

        // Create user dto and token
        UserDto userDto = userMapper.userToUserDto(user);
        String token = tokenHandler.createToken(userDto);

        // Set cookie
        Cookie cookie = new Cookie("access_token", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // Set to true in production with HTTPS
        cookie.setPath("/");
        cookie.setMaxAge(60 * 60 * 24); // 1 day
        // For localhost development with cross-origin (different ports):
        // Modern browsers allow SameSite=None without Secure for localhost
        cookie.setAttribute("SameSite", "Lax");

        response.addCookie(cookie);

        // Get expiration time
        long expirationTimeSeconds = tokenHandler.getTime().getSeconds();

        // Return auth response
        return new AuthResponse(
                token,
                expirationTimeSeconds,
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getRole()
        );
    }

    @Override
    public void logout(HttpServletRequest request, HttpServletResponse response) {

        // 🔹 مسح الكوكي
        Cookie cookie = new Cookie("access_token", null);
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // true في production مع HTTPS
        cookie.setPath("/");
        cookie.setMaxAge(0); // 👈 delete

        response.addCookie(cookie);

        // 🔹 clear spring security context
        SecurityContextHolder.clearContext();

        // 🔹 invalidate session لو موجودة
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }

    @Override
    public UserDto getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDto) {
            return (UserDto) principal;
        }

        return null;
    }
}