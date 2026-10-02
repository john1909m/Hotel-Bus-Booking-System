package com.spring.boot.exception;

/**
 * Exception thrown when booking dates are invalid.
 */
public class InvalidBookingDatesException extends RuntimeException {

    public InvalidBookingDatesException(String message) {
        super(message);
    }
}