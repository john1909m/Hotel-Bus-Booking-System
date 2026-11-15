package com.spring.boot.exception;

/**
 * Exception thrown when a bus trip is unavailable for booking.
 */
public class BusTripUnavailableException extends BaseApiException {

    public BusTripUnavailableException(String errorCode) {
        super(errorCode);
    }

    public BusTripUnavailableException(String errorCode, Object... args) {
        super(errorCode, args);
    }

    public BusTripUnavailableException(String errorCode, Throwable cause) {
        super(errorCode, cause);
    }
}
