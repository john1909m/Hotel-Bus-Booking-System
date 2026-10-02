package com.spring.boot.exception;

/**
 * Exception thrown when there is a booking conflict.
 */
public class BookingConflictException extends RuntimeException {

    public BookingConflictException(String message) {
        super(message);
    }
}