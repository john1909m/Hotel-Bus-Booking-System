package com.spring.boot.exception;

/**
 * Exception thrown when payment cannot be processed due to invalid booking state.
 */
public class InvalidPaymentBookingStateException extends BaseApiException {

    public InvalidPaymentBookingStateException(String errorCode) {
        super(errorCode);
    }

    public InvalidPaymentBookingStateException(String errorCode, Object... args) {
        super(errorCode, args);
    }

    public InvalidPaymentBookingStateException(String errorCode, Throwable cause) {
        super(errorCode, cause);
    }
}
