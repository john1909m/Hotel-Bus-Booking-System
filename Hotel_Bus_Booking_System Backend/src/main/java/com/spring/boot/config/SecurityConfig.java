package com.spring.boot.config;

//import com.spring.boot.config.filter.AuthFilter;
//import com.spring.boot.config.rateLimiting.RateLimitFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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
//    private final AuthFilter authFilter;
//    private final RateLimitFilter rateLimitFilter;

//    @Autowired
//    public SecurityConfig(AuthFilter authFilter,RateLimitFilter rateLimitFilter) {
//        this.rateLimitFilter=rateLimitFilter;
//        this.authFilter = authFilter;
//    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

//    @Bean
//    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
//        http
//                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
//                .csrf(AbstractHttpConfigurer::disable)
////                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
////                .addFilterBefore(authFilter, UsernamePasswordAuthenticationFilter.class)
//                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
//
//                .authorizeHttpRequests(auth -> auth
//                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
//
//                        .anyRequest().authenticated()
//                );
//
//        return http.build();
//    }


@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    .anyRequest().permitAll()   // ← التغيير هنا
            );

    return http.build();
}
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:5173","http://localhost:8080","https://www.storely-eg.com","https://storely-eg.com","http://localhost:5173/*")); // React frontend
        configuration.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS")) ;
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setExposedHeaders(List.of("Set-Cookie"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }




}
