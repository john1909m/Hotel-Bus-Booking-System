package com.spring.boot.exception;

/**
 * Exception thrown when the AI service is unavailable.
 */
public class AiServiceUnavailableException extends RuntimeException {
    public AiServiceUnavailableException(String message) {
        super(message);
    }

    public AiServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}