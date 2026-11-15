package com.spring.boot.exception;

/**
 * Exception thrown when authentication fails.
 */
public class AuthenticationException extends BaseApiException {

    public AuthenticationException(String errorCode) {
        super(errorCode);
    }

    public AuthenticationException(String errorCode, Throwable cause) {
        super(errorCode, cause);
    }

    public AuthenticationException(String errorCode, Object... args) {
        super(errorCode, args);
    }
}
