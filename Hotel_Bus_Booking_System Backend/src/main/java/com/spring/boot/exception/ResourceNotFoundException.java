package com.spring.boot.exception;

/**
 * Exception thrown when a resource is not found.
 */
public class ResourceNotFoundException extends BaseApiException {

    public ResourceNotFoundException(String errorCode) {
        super(errorCode);
    }

    public ResourceNotFoundException(String errorCode, Object... args) {
        super(errorCode, args);
    }

    public ResourceNotFoundException(String errorCode, Throwable cause) {
        super(errorCode, cause);
    }

    public ResourceNotFoundException(String errorCode, Throwable cause, Object... args) {
        super(errorCode, cause, args);
    }
}
