package com.spring.boot.exception;

/**
 * Exception thrown when attempting to book a seat that is already booked.
 */
public class SeatAlreadyBookedException extends BaseApiException {

    public SeatAlreadyBookedException(String errorCode) {
        super(errorCode);
    }

    public SeatAlreadyBookedException(String errorCode, Object... args) {
        super(errorCode, args);
    }

    public SeatAlreadyBookedException(String errorCode, Throwable cause) {
        super(errorCode, cause);
    }
}
