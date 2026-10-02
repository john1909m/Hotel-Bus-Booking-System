package com.spring.boot.exception;

/**
 * Exception thrown when a seat does not belong to the selected bus.
 */
public class InvalidSeatException extends RuntimeException {

    public InvalidSeatException(String message) {
        super(message);
    }
}