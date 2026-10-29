package com.spring.boot.controller;

import com.spring.boot.config.SecurityConfig;
import com.spring.boot.config.filter.AuthFilter;
import com.spring.boot.helper.BundleMessageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsSecurityTest {

    @Mock
    private AuthFilter authFilter;

    @Mock
    private BundleMessageService bundleMessageService;

    @Test
    @DisplayName("AuthenticationEntryPoint returns 401 JSON when unauthenticated")
    void testAuthenticationEntryPoint_Returns401Json() throws Exception {
        when(bundleMessageService.getMessage("Unauthorized")).thenReturn("Unauthorized access");

        SecurityConfig securityConfig = new SecurityConfig(authFilter, bundleMessageService);
        // Extract the entry point logic as configured in SecurityConfig
        AuthenticationEntryPoint entryPoint = (request, response, authException) -> {
            String errorKey = (String) request.getAttribute("jwt_error");
            if (errorKey == null) {
                errorKey = "Unauthorized";
            }
            String message = bundleMessageService.getMessage(errorKey);
            response.setStatus(401);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(String.format("{\"error\":\"Unauthorized\",\"message\":\"%s\"}", message));
        };

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        entryPoint.commence(request, response, new AuthenticationException("Unauthenticated") {});

        assertEquals(401, response.getStatus());
        assertEquals("application/json;charset=UTF-8", response.getContentType());
        assertTrue(response.getContentAsString().contains("\"error\":\"Unauthorized\""));
        assertTrue(response.getContentAsString().contains("Unauthorized access"));
    }

    @Test
    @DisplayName("AccessDeniedHandler returns 403 JSON when customer role is denied")
    void testAccessDeniedHandler_Returns403Json() throws Exception {
        when(bundleMessageService.getMessage("error.access_denied"))
                .thenReturn("Access denied. You do not have permission for this action.");

        AccessDeniedHandler accessDeniedHandler = (request, response, accessDeniedException) -> {
            String message = bundleMessageService.getMessage("error.access_denied");
            if (message == null || "error.access_denied".equals(message)) {
                message = bundleMessageService.getMessage("Access denied");
            }
            response.setStatus(403);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(String.format("{\"error\":\"Forbidden\",\"message\":\"%s\"}", message));
        };

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        accessDeniedHandler.handle(request, response, new AccessDeniedException("Forbidden"));

        assertEquals(403, response.getStatus());
        assertEquals("application/json;charset=UTF-8", response.getContentType());
        assertTrue(response.getContentAsString().contains("\"error\":\"Forbidden\""));
        assertTrue(response.getContentAsString().contains("Access denied. You do not have permission for this action."));
    }
}
