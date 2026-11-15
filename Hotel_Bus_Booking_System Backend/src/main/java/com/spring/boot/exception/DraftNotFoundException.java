package com.spring.boot.exception;

/**
 * Exception thrown when a booking draft is not found.
 */
public class DraftNotFoundException extends BaseApiException {

    public DraftNotFoundException(String errorCode) {
        super(errorCode);
    }

    public DraftNotFoundException(String errorCode, Throwable cause) {
        super(errorCode, cause);
    }

    public DraftNotFoundException(String errorCode, Object... args) {
        super(errorCode, args);
    }
}
