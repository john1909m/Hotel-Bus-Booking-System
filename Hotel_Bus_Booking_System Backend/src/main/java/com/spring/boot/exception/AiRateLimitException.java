package com.spring.boot.exception;

public class AiRateLimitException extends BaseApiException {

    public AiRateLimitException(Throwable cause) {
        super(ErrorCode.AI_RATE_LIMIT, cause);
    }

    public AiRateLimitException(String errorCode) {
        super(errorCode);
    }

    public AiRateLimitException(String errorCode, Throwable cause) {
        super(errorCode, cause);
    }
}
