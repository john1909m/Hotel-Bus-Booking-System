package com.spring.boot.exception;

/**
 * Exception thrown when a seat selection is invalid.
 */
public class InvalidSeatException extends BaseApiException {

    public InvalidSeatException(String errorCode) {
        super(errorCode);
    }

    public InvalidSeatException(String errorCode, Object... args) {
        super(errorCode, args);
    }

    public InvalidSeatException(String errorCode, Throwable cause) {
        super(errorCode, cause);
    }
}
