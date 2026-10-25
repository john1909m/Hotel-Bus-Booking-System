package com.spring.boot.config.rateLimiting;

import com.spring.boot.helper.BundleMessageService;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Order(1)
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final BundleMessageService bundleMessageService;

    public RateLimitFilter(BundleMessageService bundleMessageService) {
        this.bundleMessageService = bundleMessageService;
    }

    private static final List<String> RATE_LIMITED_PATHS = List.of(
            "/api/auth/login"
    );

    private Bucket createBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(5)
                        .refillGreedy(5, Duration.ofMinutes(2))
                        .build())
                .build();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();

        boolean shouldLimit = RATE_LIMITED_PATHS.stream()
                .anyMatch(path::startsWith);

        if (!shouldLimit) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = request.getHeader("X-Forwarded-For");
        if (clientIp == null || clientIp.isBlank()) {
            clientIp = request.getRemoteAddr();
        } else {
            clientIp = clientIp.split(",")[0].trim();
        }

        String key = clientIp + ":" + path;
        Bucket bucket = buckets.computeIfAbsent(key, k -> createBucket());

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            String message = bundleMessageService.getMessage("too.many.requests");
            if ("too.many.requests".equals(message)) {
                message = bundleMessageService.getMessage("ai.rate.limit");
            }

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");

            String jsonResponse = String.format("{\"error\":\"Too Many Requests\",\"message\":\"%s\",\"message_en\":\"%s\"}", message, message);
            response.getWriter().write(jsonResponse);
        }
    }
}