package com.spring.boot.exception;

/**
 * Exception thrown when guest count is invalid.
 */
public class InvalidGuestCountException extends RuntimeException {

    public InvalidGuestCountException(String message) {
        super(message);
    }
}