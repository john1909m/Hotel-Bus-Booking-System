package com.spring.boot.exception;

/**
 * Exception thrown when image validation fails.
 */
public class InvalidImageException extends BaseApiException {

    public InvalidImageException(String errorCode) {
        super(errorCode);
    }

    public InvalidImageException(String errorCode, Throwable cause) {
        super(errorCode, cause);
    }

    public InvalidImageException(String errorCode, Object... args) {
        super(errorCode, args);
    }
}
