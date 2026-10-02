package com.spring.boot.exception;

import com.spring.boot.helper.BundleMessageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Global exception handler for the application.
 */
@ControllerAdvice
public class GlobalExceptionHandler {

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

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<String> handleGeneralException(Exception ex) {
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(bundleMessageService.getMessage("error.internal_server_error"));
    }
}