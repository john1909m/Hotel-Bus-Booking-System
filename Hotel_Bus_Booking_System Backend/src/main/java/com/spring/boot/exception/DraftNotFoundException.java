package com.spring.boot.exception;

/**
 * Exception thrown when a booking draft is not found.
 */
public class DraftNotFoundException extends RuntimeException {
    public DraftNotFoundException(String message) {
        super(message);
    }

    public DraftNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}