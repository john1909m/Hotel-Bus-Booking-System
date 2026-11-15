package com.spring.boot.exception;

/**
 * Exception thrown when the AI service is unavailable.
 */
public class AiServiceUnavailableException extends BaseApiException {

    public AiServiceUnavailableException(String errorCode) {
        super(errorCode);
    }

    public AiServiceUnavailableException(String errorCode, Throwable cause) {
        super(errorCode, cause);
    }
}
