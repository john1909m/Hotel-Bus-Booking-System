package com.spring.boot.exception;

import com.spring.boot.dto.ErrorResponse;
import com.spring.boot.helper.BundleMessageService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSource;
import org.springframework.context.NoSuchMessageException;
import org.springframework.context.i18n.LocaleContextHolder;
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
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;
import java.util.*;

/**
 * Global exception handler providing standardized error responses with stable error codes and i18n support.
 */
@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private final MessageSource messageSource;
    private final BundleMessageService bundleMessageService;

    private static final Map<String, String> KEY_TO_CODE_MAP = new HashMap<>();

    static {
        KEY_TO_CODE_MAP.put("error.hotel_not_found", ErrorCode.HOTEL_NOT_FOUND);
        KEY_TO_CODE_MAP.put("error.room_not_found", ErrorCode.ROOM_NOT_FOUND);
        KEY_TO_CODE_MAP.put("error.bus_trip_not_found", ErrorCode.BUS_TRIP_NOT_FOUND);
        KEY_TO_CODE_MAP.put("error.bus_seat_not_found", ErrorCode.BUS_SEAT_NOT_FOUND);
        KEY_TO_CODE_MAP.put("error.user_not_found", ErrorCode.USER_NOT_FOUND);
        KEY_TO_CODE_MAP.put("error.bus_booking_not_found", ErrorCode.BUS_BOOKING_NOT_FOUND);
        KEY_TO_CODE_MAP.put("error.payment_not_found", ErrorCode.PAYMENT_NOT_FOUND);
        KEY_TO_CODE_MAP.put("error.hotel_booking_not_found", ErrorCode.HOTEL_BOOKING_NOT_FOUND);
        KEY_TO_CODE_MAP.put("error.hotel_bus_stop_not_found", ErrorCode.HOTEL_BUS_STOP_NOT_FOUND);
        KEY_TO_CODE_MAP.put("error.feature_not_found", ErrorCode.BUS_FEATURE_NOT_FOUND);
        KEY_TO_CODE_MAP.put("error.feature_inactive", ErrorCode.BUS_FEATURE_INACTIVE);
        KEY_TO_CODE_MAP.put("error.room_type_not_found", ErrorCode.ROOM_TYPE_NOT_FOUND);
        KEY_TO_CODE_MAP.put("error.hotel_image_not_found", ErrorCode.IMAGE_NOT_FOUND);
        KEY_TO_CODE_MAP.put("error.invalid_image_url", ErrorCode.IMAGE_INVALID_URL);
        KEY_TO_CODE_MAP.put("error.image_host_not_allowed", ErrorCode.IMAGE_HOST_NOT_ALLOWED);
        KEY_TO_CODE_MAP.put("error.invalid_content_type", ErrorCode.IMAGE_INVALID_CONTENT_TYPE);
        KEY_TO_CODE_MAP.put("error.storage_disabled", ErrorCode.IMAGE_STORAGE_DISABLED);
        KEY_TO_CODE_MAP.put("error.check_out_before_check_in", ErrorCode.HOTEL_BOOKING_CHECK_OUT_BEFORE_CHECK_IN);
        KEY_TO_CODE_MAP.put("error.check_in_past", ErrorCode.HOTEL_BOOKING_CHECK_IN_PAST);
        KEY_TO_CODE_MAP.put("error.guest_count_exceeds_capacity", ErrorCode.HOTEL_BOOKING_GUEST_COUNT_EXCEEDED);
        KEY_TO_CODE_MAP.put("error.invalid_adults", ErrorCode.HOTEL_BOOKING_INVALID_ADULTS);
        KEY_TO_CODE_MAP.put("error.invalid_child_age", ErrorCode.HOTEL_BOOKING_INVALID_CHILD_AGE);
        KEY_TO_CODE_MAP.put("error.room_not_available", ErrorCode.ROOM_UNAVAILABLE);
        KEY_TO_CODE_MAP.put("error.room_named_not_available", ErrorCode.ROOM_NAMED_UNAVAILABLE);
        KEY_TO_CODE_MAP.put("error.duplicate_rooms", ErrorCode.ROOM_DUPLICATE_SELECTION);
        KEY_TO_CODE_MAP.put("error.rooms_different_hotels", ErrorCode.ROOM_DIFFERENT_HOTELS);
        KEY_TO_CODE_MAP.put("error.invalid_seat", ErrorCode.BUS_SEAT_INVALID);
        KEY_TO_CODE_MAP.put("error.same_trip", ErrorCode.BUS_TRIP_SAME_RETURN);
        KEY_TO_CODE_MAP.put("error.seat_not_belong_to_trip", ErrorCode.BUS_SEAT_NOT_BELONG_TO_TRIP);
        KEY_TO_CODE_MAP.put("error.seat_already_booked", ErrorCode.BUS_SEAT_ALREADY_BOOKED);
        KEY_TO_CODE_MAP.put("error.seat_already_booked_number", ErrorCode.BUS_SEAT_ALREADY_BOOKED);
        KEY_TO_CODE_MAP.put("error.seat_does_not_belong_to_bus", ErrorCode.BUS_SEAT_NOT_BELONG_TO_BUS);
        KEY_TO_CODE_MAP.put("error.trip_not_bookable", ErrorCode.BUS_TRIP_UNAVAILABLE);
        KEY_TO_CODE_MAP.put("error.trip_departed", ErrorCode.BUS_TRIP_DEPARTED);
        KEY_TO_CODE_MAP.put("error.arrival_time_before_departure", ErrorCode.BUS_TRIP_ARRIVAL_BEFORE_DEPARTURE);
        KEY_TO_CODE_MAP.put("error.draft_not_found", ErrorCode.DRAFT_NOT_FOUND);
        KEY_TO_CODE_MAP.put("error.draft_expired", ErrorCode.DRAFT_EXPIRED);
        KEY_TO_CODE_MAP.put("error.price_changed", ErrorCode.DRAFT_PRICE_CHANGED);
        KEY_TO_CODE_MAP.put("error.draft.rooms_required", ErrorCode.DRAFT_ROOMS_REQUIRED);
        KEY_TO_CODE_MAP.put("error.draft.room_not_in_hotel", ErrorCode.DRAFT_ROOM_NOT_IN_HOTEL);
        KEY_TO_CODE_MAP.put("error.draft.room_unavailable", ErrorCode.DRAFT_ROOM_UNAVAILABLE);
        KEY_TO_CODE_MAP.put("error.draft.capacity_exceeded", ErrorCode.DRAFT_CAPACITY_EXCEEDED);
        KEY_TO_CODE_MAP.put("error.draft.seat_count_mismatch", ErrorCode.DRAFT_SEAT_COUNT_MISMATCH);
        KEY_TO_CODE_MAP.put("error.draft.seat_unavailable", ErrorCode.DRAFT_SEAT_UNAVAILABLE);
        KEY_TO_CODE_MAP.put("error.draft.seat_from_other_bus", ErrorCode.DRAFT_SEAT_FROM_OTHER_BUS);
        KEY_TO_CODE_MAP.put("error.draft.duplicate_selection", ErrorCode.DRAFT_DUPLICATE_SELECTION);
        KEY_TO_CODE_MAP.put("error.payment_already_completed", ErrorCode.PAYMENT_ALREADY_COMPLETED);
        KEY_TO_CODE_MAP.put("error.room_has_bookings", ErrorCode.ROOM_HAS_BOOKINGS);
        KEY_TO_CODE_MAP.put("error.trip_has_bookings", ErrorCode.BUS_TRIP_HAS_BOOKINGS);
        KEY_TO_CODE_MAP.put("error.hotel_has_bookings", ErrorCode.HOTEL_HAS_BOOKINGS);
        KEY_TO_CODE_MAP.put("error.email_exists", ErrorCode.USER_EMAIL_EXISTS);
        KEY_TO_CODE_MAP.put("Email.already.exists", ErrorCode.AUTH_EMAIL_ALREADY_EXISTS);
        KEY_TO_CODE_MAP.put("Bad.credentials", ErrorCode.AUTH_INVALID_CREDENTIALS);
        KEY_TO_CODE_MAP.put("error.access_denied", ErrorCode.AUTH_ACCESS_DENIED);
        KEY_TO_CODE_MAP.put("Access denied", ErrorCode.AUTH_ACCESS_DENIED);
        KEY_TO_CODE_MAP.put("Unauthorized", ErrorCode.AUTH_UNAUTHORIZED);
        KEY_TO_CODE_MAP.put("Token.expired", ErrorCode.AUTH_TOKEN_EXPIRED);
        KEY_TO_CODE_MAP.put("auth.token.expired", ErrorCode.AUTH_TOKEN_EXPIRED);
        KEY_TO_CODE_MAP.put("auth.token.invalid", ErrorCode.AUTH_TOKEN_INVALID);
        KEY_TO_CODE_MAP.put("error.data_conflict", ErrorCode.DATA_CONFLICT);
        KEY_TO_CODE_MAP.put("error.concurrent_modification", ErrorCode.CONCURRENT_MODIFICATION);
        KEY_TO_CODE_MAP.put("error.internal", ErrorCode.INTERNAL_ERROR);
        KEY_TO_CODE_MAP.put("error.internal_server_error", ErrorCode.INTERNAL_ERROR);
        KEY_TO_CODE_MAP.put("error.malformed_request", ErrorCode.MALFORMED_REQUEST);
        KEY_TO_CODE_MAP.put("error.invalid_sort", ErrorCode.INVALID_SORT);
        KEY_TO_CODE_MAP.put("error.invalid_sort_field", ErrorCode.INVALID_SORT);
        KEY_TO_CODE_MAP.put("error.type_mismatch", ErrorCode.TYPE_MISMATCH);
        KEY_TO_CODE_MAP.put("ai.service.unavailable", ErrorCode.AI_SERVICE_UNAVAILABLE);
        KEY_TO_CODE_MAP.put("ai.rate.limit", ErrorCode.AI_RATE_LIMIT);
        KEY_TO_CODE_MAP.put("error.date_from_required", ErrorCode.ANALYTICS_DATE_FROM_REQUIRED);
        KEY_TO_CODE_MAP.put("error.date_to_required", ErrorCode.ANALYTICS_DATE_TO_REQUIRED);
        KEY_TO_CODE_MAP.put("error.date_range_invalid", ErrorCode.ANALYTICS_DATE_RANGE_INVALID);
        KEY_TO_CODE_MAP.put("error.date_range_exceeded", ErrorCode.ANALYTICS_DATE_RANGE_EXCEEDED);
        KEY_TO_CODE_MAP.put("error.granularity_invalid", ErrorCode.ANALYTICS_GRANULARITY_INVALID);
        KEY_TO_CODE_MAP.put("error.booking_type_invalid", ErrorCode.ANALYTICS_BOOKING_TYPE_INVALID);
        KEY_TO_CODE_MAP.put("error.sort_by_invalid", ErrorCode.ANALYTICS_SORT_BY_INVALID);
        KEY_TO_CODE_MAP.put("error.limit_invalid", ErrorCode.ANALYTICS_LIMIT_INVALID);
        KEY_TO_CODE_MAP.put("too.many.requests", ErrorCode.TOO_MANY_REQUESTS);
        KEY_TO_CODE_MAP.put("error.too_many_requests", ErrorCode.TOO_MANY_REQUESTS);
    }

    public GlobalExceptionHandler(BundleMessageService bundleMessageService) {
        this.bundleMessageService = bundleMessageService;
        this.messageSource = bundleMessageService != null ? bundleMessageService.getMessageSource() : null;
    }

    private String resolveMessage(String codeOrKey, Object[] args, Locale locale) {
        if (codeOrKey == null) {
            codeOrKey = ErrorCode.INTERNAL_ERROR;
        }
        if (messageSource != null) {
            try {
                return messageSource.getMessage(codeOrKey, args, locale);
            } catch (NoSuchMessageException ignored) {
            }
            String mappedCode = KEY_TO_CODE_MAP.get(codeOrKey);
            if (mappedCode != null) {
                try {
                    return messageSource.getMessage(mappedCode, args, locale);
                } catch (NoSuchMessageException ignored) {
                }
            }
        }
        if (bundleMessageService != null) {
            String msg = bundleMessageService.getMessage(codeOrKey, args);
            if (msg != null && !msg.equals(codeOrKey)) {
                return msg;
            }
        }
        return codeOrKey;
    }

    private String resolveErrorCode(String codeOrKey, String defaultCode) {
        if (codeOrKey == null) {
            return defaultCode;
        }
        if (KEY_TO_CODE_MAP.containsKey(codeOrKey)) {
            return KEY_TO_CODE_MAP.get(codeOrKey);
        }
        if (codeOrKey.matches("^[A-Z0-9_]+$")) {
            return codeOrKey;
        }
        return defaultCode;
    }

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String code, String message, HttpServletRequest request) {
        return buildResponse(status, code, message, request, null);
    }

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String code, String message, HttpServletRequest request, List<ErrorResponse.FieldErrorDetail> errors) {
        String path = request != null ? request.getRequestURI() : null;
        ErrorResponse body = ErrorResponse.builder()
                .timestamp(Instant.now().toString())
                .status(status.value())
                .code(code)
                .message(message)
                .path(path)
                .errors(errors)
                .build();
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_JSON).body(body);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(ResourceNotFoundException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = resolveErrorCode(ex.getErrorCode(), ErrorCode.RESOURCE_NOT_FOUND);
        String message = resolveMessage(ex.getErrorCode(), ex.getArgs(), locale);
        return buildResponse(HttpStatus.NOT_FOUND, code, message, request);
    }

    @ExceptionHandler(RoomUnavailableException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorResponse> handleRoomUnavailableException(RoomUnavailableException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = resolveErrorCode(ex.getErrorCode(), ErrorCode.ROOM_UNAVAILABLE);
        String message = resolveMessage(ex.getErrorCode(), ex.getArgs(), locale);
        return buildResponse(HttpStatus.CONFLICT, code, message, request);
    }

    @ExceptionHandler(BookingConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorResponse> handleBookingConflictException(BookingConflictException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = resolveErrorCode(ex.getErrorCode(), ErrorCode.BOOKING_CONFLICT);
        String message = resolveMessage(ex.getErrorCode(), ex.getArgs(), locale);
        return buildResponse(HttpStatus.CONFLICT, code, message, request);
    }

    @ExceptionHandler(AiServiceUnavailableException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public ResponseEntity<ErrorResponse> handleAiUnavailable(AiServiceUnavailableException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = ErrorCode.AI_SERVICE_UNAVAILABLE;
        String message = resolveMessage(ErrorCode.AI_SERVICE_UNAVAILABLE, null, locale);
        return buildResponse(HttpStatus.SERVICE_UNAVAILABLE, code, message, request);
    }

    @ExceptionHandler(AiRateLimitException.class)
    @ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
    public ResponseEntity<ErrorResponse> handleAiRateLimit(AiRateLimitException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = ErrorCode.AI_RATE_LIMIT;
        String message = resolveMessage(ErrorCode.AI_RATE_LIMIT, null, locale);
        return buildResponse(HttpStatus.TOO_MANY_REQUESTS, code, message, request);
    }

    @ExceptionHandler(InvalidBookingDatesException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleInvalidBookingDatesException(InvalidBookingDatesException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = resolveErrorCode(ex.getErrorCode(), ErrorCode.HOTEL_BOOKING_DATES_INVALID);
        String message = resolveMessage(ex.getErrorCode(), ex.getArgs(), locale);
        return buildResponse(HttpStatus.BAD_REQUEST, code, message, request);
    }

    @ExceptionHandler(InvalidGuestCountException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleInvalidGuestCountException(InvalidGuestCountException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = resolveErrorCode(ex.getErrorCode(), ErrorCode.HOTEL_BOOKING_GUEST_COUNT_EXCEEDED);
        String message = resolveMessage(ex.getErrorCode(), ex.getArgs(), locale);
        return buildResponse(HttpStatus.BAD_REQUEST, code, message, request);
    }

    @ExceptionHandler(BusTripUnavailableException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorResponse> handleBusTripUnavailableException(BusTripUnavailableException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = resolveErrorCode(ex.getErrorCode(), ErrorCode.BUS_TRIP_UNAVAILABLE);
        String message = resolveMessage(ex.getErrorCode(), ex.getArgs(), locale);
        return buildResponse(HttpStatus.CONFLICT, code, message, request);
    }

    @ExceptionHandler(SeatAlreadyBookedException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorResponse> handleSeatAlreadyBookedException(SeatAlreadyBookedException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = resolveErrorCode(ex.getErrorCode(), ErrorCode.BUS_SEAT_ALREADY_BOOKED);
        String message = resolveMessage(ex.getErrorCode(), ex.getArgs(), locale);
        return buildResponse(HttpStatus.CONFLICT, code, message, request);
    }

    @ExceptionHandler(InvalidSeatException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleInvalidSeatException(InvalidSeatException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = resolveErrorCode(ex.getErrorCode(), ErrorCode.BUS_SEAT_INVALID);
        String message = resolveMessage(ex.getErrorCode(), ex.getArgs(), locale);
        return buildResponse(HttpStatus.BAD_REQUEST, code, message, request);
    }

    @ExceptionHandler(InvalidRouteTripRelationshipException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleInvalidRouteTripRelationshipException(InvalidRouteTripRelationshipException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = resolveErrorCode(ex.getErrorCode(), ErrorCode.BUS_ROUTE_TRIP_RELATIONSHIP_INVALID);
        String message = resolveMessage(ex.getErrorCode(), ex.getArgs(), locale);
        return buildResponse(HttpStatus.BAD_REQUEST, code, message, request);
    }

    @ExceptionHandler(InvalidPaymentBookingStateException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleInvalidPaymentBookingStateException(InvalidPaymentBookingStateException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = resolveErrorCode(ex.getErrorCode(), ErrorCode.PAYMENT_BOOKING_STATE_INVALID);
        String message = resolveMessage(ex.getErrorCode(), ex.getArgs(), locale);
        return buildResponse(HttpStatus.BAD_REQUEST, code, message, request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = resolveErrorCode(ex.getMessage(), ErrorCode.INVALID_ARGUMENT);
        String message = resolveMessage(ex.getMessage(), null, locale);
        return buildResponse(HttpStatus.BAD_REQUEST, code, message, request);
    }

    @ExceptionHandler(DraftExpiredException.class)
    @ResponseStatus(HttpStatus.GONE)
    public ResponseEntity<ErrorResponse> handleDraftExpiredException(DraftExpiredException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = resolveErrorCode(ex.getErrorCode(), ErrorCode.DRAFT_EXPIRED);
        String message = resolveMessage(ex.getErrorCode(), ex.getArgs(), locale);
        return buildResponse(HttpStatus.GONE, code, message, request);
    }

    @ExceptionHandler(DraftNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<ErrorResponse> handleDraftNotFoundException(DraftNotFoundException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = resolveErrorCode(ex.getErrorCode(), ErrorCode.DRAFT_NOT_FOUND);
        String message = resolveMessage(ex.getErrorCode(), ex.getArgs(), locale);
        return buildResponse(HttpStatus.NOT_FOUND, code, message, request);
    }

    @ExceptionHandler(PriceChangedException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorResponse> handlePriceChangedException(PriceChangedException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = resolveErrorCode(ex.getErrorCode(), ErrorCode.DRAFT_PRICE_CHANGED);
        String message = resolveMessage(ex.getErrorCode(), null, locale);
        return buildResponse(HttpStatus.CONFLICT, code, message, request);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleMethodArgumentTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = ErrorCode.TYPE_MISMATCH;
        String message = resolveMessage(ErrorCode.TYPE_MISMATCH, null, locale);
        return buildResponse(HttpStatus.BAD_REQUEST, code, message, request);
    }

    @ExceptionHandler({
            org.springframework.security.core.AuthenticationException.class,
            AuthenticationException.class
    })
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(Exception ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = ErrorCode.AUTH_INVALID_CREDENTIALS;
        String message = resolveMessage(ErrorCode.AUTH_INVALID_CREDENTIALS, null, locale);
        return buildResponse(HttpStatus.UNAUTHORIZED, code, message, request);
    }

    @ExceptionHandler(AuthorizationException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ResponseEntity<ErrorResponse> handleAuthorizationException(AuthorizationException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = resolveErrorCode(ex.getErrorCode(), ErrorCode.AUTH_ACCESS_DENIED);
        String message = resolveMessage(ex.getErrorCode(), ex.getArgs(), locale);
        return buildResponse(HttpStatus.FORBIDDEN, code, message, request);
    }

    @ExceptionHandler(PropertyReferenceException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handlePropertyReferenceException(PropertyReferenceException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = ErrorCode.INVALID_SORT;
        String message = resolveMessage(ErrorCode.INVALID_SORT, null, locale);
        return buildResponse(HttpStatus.BAD_REQUEST, code, message, request);
    }

    @ExceptionHandler(InvalidImageException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleInvalidImageException(InvalidImageException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = resolveErrorCode(ex.getErrorCode(), ErrorCode.IMAGE_INVALID_CONTENT_TYPE);
        String message = resolveMessage(ex.getErrorCode(), ex.getArgs(), locale);
        return buildResponse(HttpStatus.BAD_REQUEST, code, message, request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = ErrorCode.AUTH_ACCESS_DENIED;
        String message = resolveMessage(ErrorCode.AUTH_ACCESS_DENIED, null, locale);
        return buildResponse(HttpStatus.FORBIDDEN, code, message, request);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleHttpMessageNotReadable(HttpMessageNotReadableException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = ErrorCode.MALFORMED_REQUEST;
        String message = resolveMessage(ErrorCode.MALFORMED_REQUEST, null, locale);
        return buildResponse(HttpStatus.BAD_REQUEST, code, message, request);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleMissingServletRequestParameter(MissingServletRequestParameterException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = ErrorCode.MALFORMED_REQUEST;
        String message = resolveMessage(ErrorCode.MALFORMED_REQUEST, null, locale);
        return buildResponse(HttpStatus.BAD_REQUEST, code, message, request);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    @ResponseStatus(HttpStatus.METHOD_NOT_ALLOWED)
    public ResponseEntity<ErrorResponse> handleHttpRequestMethodNotSupported(HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = ErrorCode.METHOD_NOT_ALLOWED;
        String message = resolveMessage(ErrorCode.METHOD_NOT_ALLOWED, null, locale);
        return buildResponse(HttpStatus.METHOD_NOT_ALLOWED, code, message, request);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<ErrorResponse> handleNoResourceFoundException(NoResourceFoundException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String code = ErrorCode.RESOURCE_NOT_FOUND;
        String message = resolveMessage(ErrorCode.RESOURCE_NOT_FOUND, null, locale);
        return buildResponse(HttpStatus.NOT_FOUND, code, message, request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleMethodArgumentNotValidException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        List<ErrorResponse.FieldErrorDetail> errors = new ArrayList<>();
        String primaryCode = null;
        String primaryMessage = null;

        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            String fieldMsg = null;
            if (messageSource != null) {
                try {
                    fieldMsg = messageSource.getMessage(fe, locale);
                } catch (NoSuchMessageException ignored) {
                }
            }
            if (fieldMsg == null && fe.getDefaultMessage() != null) {
                fieldMsg = resolveMessage(fe.getDefaultMessage(), fe.getArguments(), locale);
            }
            if (fieldMsg == null) {
                fieldMsg = resolveMessage(ErrorCode.VALIDATION_FAILED, null, locale);
            }
            errors.add(new ErrorResponse.FieldErrorDetail(fe.getField(), fieldMsg));

            if (primaryCode == null) {
                primaryCode = resolveFieldErrorCode(fe.getObjectName(), fe.getField());
                if (primaryCode == null && fe.getDefaultMessage() != null && fe.getDefaultMessage().matches("^[A-Z0-9_]+$")) {
                    primaryCode = fe.getDefaultMessage();
                }
                primaryMessage = fieldMsg;
            }
        }

        if (primaryCode == null) {
            primaryCode = ErrorCode.VALIDATION_FAILED;
        }
        if (primaryMessage == null) {
            primaryMessage = resolveMessage(ErrorCode.VALIDATION_FAILED, null, locale);
        }

        return buildResponse(HttpStatus.BAD_REQUEST, primaryCode, primaryMessage, request, errors);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleConstraintViolationException(ConstraintViolationException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        List<ErrorResponse.FieldErrorDetail> errors = new ArrayList<>();
        String primaryCode = null;
        String primaryMessage = null;

        for (ConstraintViolation<?> cv : ex.getConstraintViolations()) {
            String field = cv.getPropertyPath().toString();
            String msg = resolveMessage(cv.getMessage(), null, locale);
            errors.add(new ErrorResponse.FieldErrorDetail(field, msg));
            if (primaryMessage == null) {
                primaryMessage = msg;
                if (cv.getMessage() != null && cv.getMessage().matches("^[A-Z0-9_]+$")) {
                    primaryCode = cv.getMessage();
                }
            }
        }

        if (primaryCode == null) {
            primaryCode = ErrorCode.VALIDATION_FAILED;
        }
        if (primaryMessage == null) {
            primaryMessage = resolveMessage(ErrorCode.VALIDATION_FAILED, null, locale);
        }

        return buildResponse(HttpStatus.BAD_REQUEST, primaryCode, primaryMessage, request, errors);
    }

    @ExceptionHandler(AnalyticsValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleAnalyticsValidationException(AnalyticsValidationException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        String message = resolveMessage(ex.getMessageKey(), null, locale);
        String code = resolveErrorCode(ex.getMessageKey(), ErrorCode.VALIDATION_FAILED);
        List<ErrorResponse.FieldErrorDetail> errors = List.of(new ErrorResponse.FieldErrorDetail(ex.getField(), message));
        return buildResponse(HttpStatus.BAD_REQUEST, code, message, request, errors);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolationException(DataIntegrityViolationException ex, HttpServletRequest request) {
        logger.warn("Data integrity conflict: {}", ex.getMostSpecificCause().getMessage());
        Locale locale = LocaleContextHolder.getLocale();
        String code = ErrorCode.DATA_CONFLICT;
        String message = resolveMessage(ErrorCode.DATA_CONFLICT, null, locale);
        return buildResponse(HttpStatus.CONFLICT, code, message, request);
    }

    @ExceptionHandler({
            ObjectOptimisticLockingFailureException.class,
            PessimisticLockingFailureException.class,
            CannotAcquireLockException.class
    })
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorResponse> handleLockingFailureException(Exception ex, HttpServletRequest request) {
        logger.warn("Lock acquisition / concurrency failure: {}", ex.getMessage());
        Locale locale = LocaleContextHolder.getLocale();
        String code = ErrorCode.CONCURRENT_MODIFICATION;
        String message = resolveMessage(ErrorCode.CONCURRENT_MODIFICATION, null, locale);
        return buildResponse(HttpStatus.CONFLICT, code, message, request);
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<ErrorResponse> handleGeneralException(Exception ex, HttpServletRequest request) {
        UUID correlationId = UUID.randomUUID();
        logger.error("Unhandled internal server error [correlationId={}]:", correlationId, ex);
        Locale locale = LocaleContextHolder.getLocale();
        String message = resolveMessage(ErrorCode.INTERNAL_ERROR, null, locale);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR, message, request);
    }

    private String resolveFieldErrorCode(String objectName, String field) {
        if (field == null) {
            return null;
        }
        return switch (field) {
            case "departureTime", "arrivalTime" -> ErrorCode.BUS_TRIP_TIME_REQUIRED;
            case "price" -> ErrorCode.BUS_TRIP_PRICE_REQUIRED;
            case "checkInDate", "checkOutDate" -> ErrorCode.HOTEL_BOOKING_DATES_INVALID;
            case "busId" -> ErrorCode.BUS_ID_REQUIRED;
            case "routeId" -> ErrorCode.ROUTE_ID_REQUIRED;
            default -> null;
        };
    }
}
