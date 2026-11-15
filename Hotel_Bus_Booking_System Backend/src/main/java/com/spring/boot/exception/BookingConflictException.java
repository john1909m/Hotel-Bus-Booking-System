package com.spring.boot.exception;

/**
 * Exception thrown when a booking conflict occurs.
 */
public class BookingConflictException extends BaseApiException {

    public BookingConflictException(String errorCode) {
        super(errorCode);
    }

    public BookingConflictException(String errorCode, Object... args) {
        super(errorCode, args);
    }

    public BookingConflictException(String errorCode, Throwable cause) {
        super(errorCode, cause);
    }

    public BookingConflictException(String errorCode, Throwable cause, Object... args) {
        super(errorCode, cause, args);
    }
}
