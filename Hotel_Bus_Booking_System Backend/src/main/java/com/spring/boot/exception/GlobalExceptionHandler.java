package com.spring.boot.exception;

import com.spring.boot.helper.BundleMessageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.data.core.PropertyReferenceException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import jakarta.validation.ConstraintViolationException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Global exception handler providing uniform error handling with i18n support.
 */
@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private final BundleMessageService bundleMessageService;

    public GlobalExceptionHandler(BundleMessageService bundleMessageService) {
        this.bundleMessageService = bundleMessageService;
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<String> handleResourceNotFoundException(ResourceNotFoundException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(bundleMessageService.getMessage(ex.getMessage()));
    }

    @ExceptionHandler(RoomUnavailableException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<String> handleRoomUnavailableException(RoomUnavailableException ex) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(bundleMessageService.getMessage(ex.getMessage()));
    }

    @ExceptionHandler(BookingConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<String> handleBookingConflictException(BookingConflictException ex) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(bundleMessageService.getMessage(ex.getMessage()));
    }

    @ExceptionHandler(AiServiceUnavailableException.class)
    public ResponseEntity<String> handleAiUnavailable(AiServiceUnavailableException ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(bundleMessageService.getMessage("ai.service.unavailable"));
    }

    @ExceptionHandler(InvalidBookingDatesException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<String> handleInvalidBookingDatesException(InvalidBookingDatesException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(bundleMessageService.getMessage(ex.getMessage()));
    }

    @ExceptionHandler(InvalidGuestCountException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<String> handleInvalidGuestCountException(InvalidGuestCountException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(bundleMessageService.getMessage(ex.getMessage()));
    }

    @ExceptionHandler(BusTripUnavailableException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<String> handleBusTripUnavailableException(BusTripUnavailableException ex) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(bundleMessageService.getMessage(ex.getMessage()));
    }

    @ExceptionHandler(SeatAlreadyBookedException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<String> handleSeatAlreadyBookedException(SeatAlreadyBookedException ex) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(bundleMessageService.getMessage(ex.getMessage()));
    }

    @ExceptionHandler(InvalidSeatException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<String> handleInvalidSeatException(InvalidSeatException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(bundleMessageService.getMessage(ex.getMessage()));
    }

    @ExceptionHandler(InvalidRouteTripRelationshipException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<String> handleInvalidRouteTripRelationshipException(InvalidRouteTripRelationshipException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(bundleMessageService.getMessage(ex.getMessage()));
    }

    @ExceptionHandler(InvalidPaymentBookingStateException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<String> handleInvalidPaymentBookingStateException(InvalidPaymentBookingStateException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(bundleMessageService.getMessage(ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<String> handleMethodArgumentTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(bundleMessageService.getMessage("error.type_mismatch"));
    }

    @ExceptionHandler({
            org.springframework.security.core.AuthenticationException.class,
            AuthenticationException.class
    })
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ResponseEntity<String> handleAuthenticationException(Exception ex) {
        String msg = bundleMessageService.getMessage("Bad.credentials");
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(msg);
    }

    @ExceptionHandler(AuthorizationException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ResponseEntity<String> handleAuthorizationException(AuthorizationException ex) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(bundleMessageService.getMessage(ex.getMessage()));
    }

    @ExceptionHandler(PropertyReferenceException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<String> handlePropertyReferenceException(PropertyReferenceException ex) {
        String msg = bundleMessageService.getMessage("error.invalid_sort_field");
        if ("error.invalid_sort_field".equals(msg)) {
            msg = bundleMessageService.getMessage("error.invalid_sort");
        }
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(msg);
    }

    @ExceptionHandler(InvalidImageException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<String> handleInvalidImageException(InvalidImageException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(bundleMessageService.getMessage(ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ResponseEntity<String> handleAccessDeniedException(AccessDeniedException ex) {
        String msg = bundleMessageService.getMessage("error.access_denied");
        if (msg == null || "error.access_denied".equals(msg)) {
            msg = bundleMessageService.getMessage("Access denied");
        }
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(msg);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<Map<String, Object>> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", bundleMessageService.getMessage("error.malformed_request"));
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<String> handleMissingServletRequestParameter(MissingServletRequestParameterException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(bundleMessageService.getMessage("error.malformed_request"));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    @ResponseStatus(HttpStatus.METHOD_NOT_ALLOWED)
    public ResponseEntity<String> handleHttpRequestMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity
                .status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ex.getMessage());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<String> handleNoResourceFoundException(NoResourceFoundException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<Map<String, Object>> handleMethodArgumentNotValidException(MethodArgumentNotValidException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                errors.put(error.getField(), bundleMessageService.getMessage(error.getDefaultMessage()))
        );
        String firstMessage = errors.values().stream().findFirst().orElse(bundleMessageService.getMessage("error.malformed_request"));
        body.put("message", firstMessage);
        body.put("errors", errors);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<Map<String, Object>> handleConstraintViolationException(ConstraintViolationException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(cv ->
                errors.put(cv.getPropertyPath().toString(), bundleMessageService.getMessage(cv.getMessage()))
        );
        String firstMessage = errors.values().stream().findFirst().orElse(bundleMessageService.getMessage("error.malformed_request"));
        body.put("message", firstMessage);
        body.put("errors", errors);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    @ExceptionHandler(AnalyticsValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<Map<String, Object>> handleAnalyticsValidationException(AnalyticsValidationException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        Map<String, String> errors = new LinkedHashMap<>();
        String message = bundleMessageService.getMessage(ex.getMessageKey());
        errors.put(ex.getField(), message);
        body.put("message", message);
        body.put("errors", errors);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<String> handleDataIntegrityViolationException(DataIntegrityViolationException ex) {
        // Log SQL exception on server side, return sanitized i18n message with no SQL text
        logger.warn("Data integrity conflict: {}", ex.getMostSpecificCause().getMessage());
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(bundleMessageService.getMessage("error.data_conflict"));
    }

    @ExceptionHandler({
            ObjectOptimisticLockingFailureException.class,
            PessimisticLockingFailureException.class,
            CannotAcquireLockException.class
    })
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<String> handleLockingFailureException(Exception ex) {
        logger.warn("Lock acquisition / concurrency failure: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(bundleMessageService.getMessage("error.concurrent_modification"));
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<Map<String, Object>> handleGeneralException(Exception ex) {
        UUID correlationId = UUID.randomUUID();
        logger.error("Unhandled internal server error [correlationId={}]:", correlationId, ex);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("correlationId", correlationId.toString());
        body.put("message", bundleMessageService.getMessage("error.internal"));
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }
}