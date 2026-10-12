package com.spring.boot.exception;

public class AiRateLimitException extends RuntimeException {
    public AiRateLimitException(Throwable cause) {
        super("AI rate limit exceeded", cause);
    }
}