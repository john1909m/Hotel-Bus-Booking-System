package com.spring.boot.exception;

import com.spring.boot.dto.BusTripRequestDto;
import com.spring.boot.helper.BundleMessageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import java.util.List;
import java.util.Locale;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class GlobalExceptionHandlerTest {

    private MockMvc mockMvc;

    static class TestDto {
        @NotNull(message = "Departure time is required")
        private String departureTime;

        public String getDepartureTime() {
            return departureTime;
        }

        public void setDepartureTime(String departureTime) {
            this.departureTime = departureTime;
        }
    }

    @RestController
    @RequestMapping("/api/test-errors")
    static class TestErrorController {

        @GetMapping("/not-found")
        public void throwNotFound() {
            throw new ResourceNotFoundException(ErrorCode.HOTEL_NOT_FOUND);
        }

        @GetMapping("/illegal-arg")
        public void throwIllegalArg() {
            throw new IllegalArgumentException(ErrorCode.BUS_TRIP_TIME_REQUIRED);
        }

        @GetMapping("/server-error")
        public void throwServerError() {
            throw new RuntimeException("Sensitive database credentials and internal stack trace");
        }

        @PostMapping("/validation")
        public void testValidation(@Valid @RequestBody BusTripRequestDto dto) {
        }
    }

    @BeforeEach
    void setUp() {
        ResourceBundleMessageSource messageSource = new ResourceBundleMessageSource();
        messageSource.setBasename("messages");
        messageSource.setDefaultEncoding("UTF-8");
        messageSource.setFallbackToSystemLocale(false);

        AcceptHeaderLocaleResolver localeResolver = new AcceptHeaderLocaleResolver();
        localeResolver.setSupportedLocales(List.of(Locale.ENGLISH, Locale.forLanguageTag("ar")));
        localeResolver.setDefaultLocale(Locale.ENGLISH);

        BundleMessageService bundleMessageService = new BundleMessageService(messageSource);
        GlobalExceptionHandler handler = new GlobalExceptionHandler(bundleMessageService);

        mockMvc = MockMvcBuilders.standaloneSetup(new TestErrorController())
                .setControllerAdvice(handler)
                .setLocaleResolver(localeResolver)
                .build();
    }

    @Test
    @DisplayName("Request with Accept-Language: ar returns Arabic error message")
    void testArabicErrorMessage() throws Exception {
        mockMvc.perform(get("/api/test-errors/not-found")
                        .header("Accept-Language", "ar")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.code").value("HOTEL_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("الفندق غير موجود."))
                .andExpect(jsonPath("$.path").value("/api/test-errors/not-found"))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    @DisplayName("Request with Accept-Language: en returns English error message")
    void testEnglishErrorMessage() throws Exception {
        mockMvc.perform(get("/api/test-errors/not-found")
                        .header("Accept-Language", "en")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.code").value("HOTEL_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Hotel not found."))
                .andExpect(jsonPath("$.path").value("/api/test-errors/not-found"))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    @DisplayName("Request with no Accept-Language defaults to English error message")
    void testDefaultLocaleIsEnglish() throws Exception {
        mockMvc.perform(get("/api/test-errors/not-found")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.code").value("HOTEL_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Hotel not found."))
                .andExpect(jsonPath("$.path").value("/api/test-errors/not-found"))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    @DisplayName("IllegalArgumentException with code returns translated message in Arabic and English")
    void testIllegalArgumentExceptionWithCode() throws Exception {
        mockMvc.perform(get("/api/test-errors/illegal-arg")
                        .header("Accept-Language", "ar")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("BUS_TRIP_TIME_REQUIRED"))
                .andExpect(jsonPath("$.message").value("وقت المغادرة ووقت الوصول مطلوبان."));

        mockMvc.perform(get("/api/test-errors/illegal-arg")
                        .header("Accept-Language", "en")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("BUS_TRIP_TIME_REQUIRED"))
                .andExpect(jsonPath("$.message").value("Departure and arrival times are required."));
    }

    @Test
    @DisplayName("Unknown exception (500) returns generic message without stack trace or sensitive info")
    void testInternalServerErrorNoStackTrace() throws Exception {
        mockMvc.perform(get("/api/test-errors/server-error")
                        .header("Accept-Language", "en")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.message").value("An unexpected error occurred. Please try again later."))
                .andExpect(jsonPath("$.path").value("/api/test-errors/server-error"))
                .andExpect(jsonPath("$.errors").doesNotExist())
                .andExpect(content().string(not(containsString("Sensitive database"))))
                .andExpect(content().string(not(containsString("stackTrace"))))
                .andExpect(content().string(not(containsString("RuntimeException"))));

        mockMvc.perform(get("/api/test-errors/server-error")
                        .header("Accept-Language", "ar")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.message").value("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى لاحقاً."))
                .andExpect(content().string(not(containsString("Sensitive database"))));
    }

    @Test
    @DisplayName("Spring ApplicationContext creates GlobalExceptionHandler bean without No default constructor error")
    void testSpringBeanCreation() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.registerBean(MessageSource.class, ResourceBundleMessageSource::new);
            context.register(BundleMessageService.class, GlobalExceptionHandler.class);
            context.refresh();
            GlobalExceptionHandler bean = context.getBean(GlobalExceptionHandler.class);
            assertNotNull(bean);
        }
    }

    @Test
    @DisplayName("Validation error returns 400 with field errors in Arabic and English")
    void testValidationErrorTranslation() throws Exception {
        String payloadWithoutDepartureTime = """
                {
                    "arrivalTime": "2026-05-10T12:00:00",
                    "price": 100.0,
                    "status": "SCHEDULED",
                    "busId": 1,
                    "routeId": 1
                }
                """;

        mockMvc.perform(post("/api/test-errors/validation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadWithoutDepartureTime)
                        .header("Accept-Language", "ar")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("BUS_TRIP_TIME_REQUIRED"))
                .andExpect(jsonPath("$.errors[0].field").value("departureTime"))
                .andExpect(jsonPath("$.errors[0].message").value("وقت المغادرة مطلوب"));

        mockMvc.perform(post("/api/test-errors/validation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadWithoutDepartureTime)
                        .header("Accept-Language", "en")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("BUS_TRIP_TIME_REQUIRED"))
                .andExpect(jsonPath("$.errors[0].field").value("departureTime"))
                .andExpect(jsonPath("$.errors[0].message").value("Departure time is required"));
    }
}
