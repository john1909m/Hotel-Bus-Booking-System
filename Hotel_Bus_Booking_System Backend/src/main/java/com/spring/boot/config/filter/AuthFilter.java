package com.spring.boot.config.filter;

import com.spring.boot.config.jwt.TokenHandler;
import com.spring.boot.dto.UserDto;
import com.spring.boot.enums.Role;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class AuthFilter extends OncePerRequestFilter {

    private final TokenHandler tokenHandler;

    public AuthFilter(TokenHandler tokenHandler) {
        this.tokenHandler = tokenHandler;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String token = null;
        boolean tokenExtracted = false;

        // Try to get token from cookie first
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("access_token".equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }

        // If we have a token from cookie, try to validate it
        if (token != null) {
            tokenExtracted = true;
            try {
                UserDto userDto = tokenHandler.validateToken(token);

                if (userDto != null) {
                    // Token from cookie is valid, use it
                    Role userRole = userDto.getRole();
                    if (userRole == null) {
                        // Null role indicates invalid/missing role information
                        SecurityContextHolder.clearContext();
                    } else {
                        List<SimpleGrantedAuthority> authorities =
                                List.of(new SimpleGrantedAuthority(
                                        "ROLE_" + userRole
                                ));

                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(
                                        userDto,
                                        null,
                                        authorities
                                );

                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        filterChain.doFilter(request, response);
                        return;
                    }
                }
            } catch (Exception e) {
                // Cookie token is invalid, fall through to check header
                token = null;
            }
        }

        // If cookie token was invalid or not present, try Authorization header
        if (token == null) {
            String header = request.getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) {
                token = header.substring(7);
            }
        }

        // Determine if token was extracted from header
        if (token != null && !tokenExtracted) {
            tokenExtracted = true;
        }

        // Validate token from header (if we got one)
        if (token != null) {
            try {
                UserDto userDto = tokenHandler.validateToken(token);

                if (userDto != null) {
                    Role userRole = userDto.getRole();
                    if (userRole == null) {
                        // Null role indicates invalid/missing role information
                        SecurityContextHolder.clearContext();
                    } else {
                        List<SimpleGrantedAuthority> authorities =
                                List.of(new SimpleGrantedAuthority(
                                        "ROLE_" + userRole
                                ));

                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(
                                        userDto,
                                        null,
                                        authorities
                                );

                                SecurityContextHolder.getContext().setAuthentication(authentication);
                }

            } }catch (Exception e) {
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String uri = request.getRequestURI();
        return uri.startsWith("/api/auth/signup") || uri.startsWith("/api/auth/login");
    }
}