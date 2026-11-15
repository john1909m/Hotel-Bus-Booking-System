package com.spring.boot.exception;

/**
 * Exception thrown when a booking draft has expired.
 */
public class DraftExpiredException extends BaseApiException {

    public DraftExpiredException(String errorCode) {
        super(errorCode);
    }

    public DraftExpiredException(String errorCode, Throwable cause) {
        super(errorCode, cause);
    }

    public DraftExpiredException(String errorCode, Object... args) {
        super(errorCode, args);
    }
}
