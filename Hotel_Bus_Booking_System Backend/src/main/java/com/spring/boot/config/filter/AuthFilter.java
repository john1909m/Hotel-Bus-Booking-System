package com.spring.boot.config.filter;

import com.spring.boot.config.jwt.TokenHandler;
import com.spring.boot.dto.UserDto;
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

        // Get token from cookie
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("access_token".equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }

        if (token != null) {
            try {
                UserDto userDto = tokenHandler.validateToken(token);

                if (userDto != null) {
                    List<SimpleGrantedAuthority> authorities =
                            List.of(new SimpleGrantedAuthority(
                                    "ROLE_" + userDto.getRole()
                            ));

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    userDto,
                                    null,
                                    authorities
                            );

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }

            } catch (Exception e) {
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }



    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {

        String uri = request.getRequestURI();
//        System.out.println("URI: " + request.getRequestURI());
//        System.out.println("Auth in context: " + SecurityContextHolder.getContext().getAuthentication());
//        System.out.println("Method: " + request.getMethod());
//        System.out.println("RequestURI Raw: " + request.getRequestURL());
        System.out.println("shouldNotFilter: " + request.getRequestURI());
        System.out.println("Passed security config: " + request.getRequestURI());

        return uri.startsWith("/auth/")||uri.startsWith("/store/get/name/");
    }
}
