package com.spring.boot.exception;

/**
 * Exception thrown when guest count is invalid or exceeds capacity.
 */
public class InvalidGuestCountException extends BaseApiException {

    public InvalidGuestCountException(String errorCode) {
        super(errorCode);
    }

    public InvalidGuestCountException(String errorCode, Object... args) {
        super(errorCode, args);
    }

    public InvalidGuestCountException(String errorCode, Throwable cause) {
        super(errorCode, cause);
    }
}
