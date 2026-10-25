package com.spring.boot.config;

import com.spring.boot.config.filter.AuthFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    private final AuthFilter authFilter;
    private final com.spring.boot.helper.BundleMessageService bundleMessageService;

    @Autowired
    public SecurityConfig(AuthFilter authFilter, com.spring.boot.helper.BundleMessageService bundleMessageService) {
        this.authFilter = authFilter;
        this.bundleMessageService = bundleMessageService;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(authFilter, UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(
                                (request, response, authException) -> {
                                    String errorKey = (String) request.getAttribute("jwt_error");
                                    if (errorKey == null) {
                                        errorKey = "Unauthorized";
                                    }
                                    String message = bundleMessageService.getMessage(errorKey);
                                    response.setStatus(HttpStatus.UNAUTHORIZED.value());
                                    response.setContentType("application/json;charset=UTF-8");
                                    response.getWriter().write(String.format("{\"error\":\"Unauthorized\",\"message\":\"%s\"}", message));
                                }
                        )
                )
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/meta/**").permitAll()
                        .requestMatchers(
                                "/swagger-ui.html",
                                "/swagger-ui/**",
                                "/v3/api-docs",
                                "/v3/api-docs/**",
                                "/webjars/**"
                        ).permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/signup").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()

                        // Public browsing endpoints (read-only)
                        .requestMatchers(HttpMethod.GET, "/api/hotels/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/rooms/hotel/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/buses/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/bus-stops/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/bus-routes/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/bus-trips/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/bus-seats/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/rooms/**").authenticated()

                        // Specific public endpoints for related data
                        .requestMatchers(HttpMethod.GET, "/api/bus-seats/bus/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/bus-trips/bus/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/bus-trips/route/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/payments/hotel-booking/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/payments/bus-booking/**").permitAll()

                        // Customer endpoints
                        .requestMatchers(HttpMethod.POST, "/api/hotel-bookings").hasRole("USER")
                        .requestMatchers(HttpMethod.POST, "/api/bus-bookings").hasRole("USER")
                        .requestMatchers(HttpMethod.POST, "/api/payments").hasRole("USER")
                        .requestMatchers(HttpMethod.GET, "/api/hotel-bookings/user/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/bus-bookings/user/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/users/**").hasAnyRole("USER","ADMIN")
                        .requestMatchers(HttpMethod.POST, "/bookings/drafts/{id}/confirm").hasAnyRole("USER","ADMIN")

                        // Admin endpoints
                        .requestMatchers(HttpMethod.GET, "/api/users").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/users/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/hotels").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/hotels/*/images").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/images/upload-url").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/hotel-images/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/hotel-images/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/hotels/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/hotels/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/rooms").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/rooms/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/rooms/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/buses").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/buses/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/buses/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/bus-routes").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/bus-routes/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/bus-routes/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/bus-stops").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/bus-stops/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/bus-stops/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/bus-seats").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/bus-seats/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/bus-seats/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/bus-trips").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/bus-trips/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/bus-trips/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/hotel-bus-stops").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/hotel-bus-stops/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/hotel-bus-stops/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/hotel-bookings").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/bus-bookings").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/payments").hasRole("ADMIN")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/hotel-bookings/*/status").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/bus-bookings/*/status").hasRole("ADMIN")

                        // All other endpoints require authentication (but will be handled by method security)
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated()
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:5173","http://localhost:4200","http://localhost:8080","http://localhost:5173/**","http://localhost:4200/**")); // React frontend
        configuration.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS")) ;
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type","Idempotency-Key", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"));
        configuration.setAllowCredentials(true);
        configuration.setExposedHeaders(List.of("Set-Cookie"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}