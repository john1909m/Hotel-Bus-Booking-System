package com.spring.boot.exception;

/**
 * Exception thrown when authorization fails.
 */
public class AuthorizationException extends BaseApiException {

    public AuthorizationException(String errorCode) {
        super(errorCode);
    }

    public AuthorizationException(String errorCode, Throwable cause) {
        super(errorCode, cause);
    }

    public AuthorizationException(String errorCode, Object... args) {
        super(errorCode, args);
    }
}
