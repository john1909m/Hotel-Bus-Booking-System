package com.spring.boot.service.interfaces;

import com.spring.boot.dto.AuthResponse;
import com.spring.boot.dto.LoginRequest;
import com.spring.boot.dto.RegisterRequest;
import com.spring.boot.dto.UserDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.SystemException;

public interface AuthService {
    AuthResponse signUp(RegisterRequest registerRequest) throws SystemException;
    AuthResponse login(LoginRequest loginRequest, HttpServletResponse response) throws SystemException;
    void logout(HttpServletRequest request, HttpServletResponse response);
    UserDto getCurrentUser();
}
