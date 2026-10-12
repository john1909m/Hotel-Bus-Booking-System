package com.spring.boot.exception;

/**
 * Exception thrown when a booking draft has expired.
 */
public class DraftExpiredException extends RuntimeException {
    public DraftExpiredException(String message) {
        super(message);
    }

    public DraftExpiredException(String message, Throwable cause) {
        super(message, cause);
    }
}