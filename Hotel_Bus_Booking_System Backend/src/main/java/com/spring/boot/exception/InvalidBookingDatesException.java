package com.spring.boot.exception;

/**
 * Exception thrown when booking dates are invalid.
 */
public class InvalidBookingDatesException extends BaseApiException {

    public InvalidBookingDatesException(String errorCode) {
        super(errorCode);
    }

    public InvalidBookingDatesException(String errorCode, Object... args) {
        super(errorCode, args);
    }

    public InvalidBookingDatesException(String errorCode, Throwable cause) {
        super(errorCode, cause);
    }
}
