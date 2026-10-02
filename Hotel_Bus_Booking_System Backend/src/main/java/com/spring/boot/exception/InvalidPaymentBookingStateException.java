package com.spring.boot.exception;

/**
 * Exception thrown when there is an invalid payment/booking state.
 */
public class InvalidPaymentBookingStateException extends RuntimeException {

    public InvalidPaymentBookingStateException(String message) {
        super(message);
    }
}