package com.spring.boot.exception;

/**
 * Base exception class carrying a stable error code and optional interpolation arguments.
 */
public abstract class BaseApiException extends RuntimeException {

    private final String errorCode;
    private final Object[] args;

    public BaseApiException(String errorCode) {
        super(errorCode);
        this.errorCode = errorCode;
        this.args = null;
    }

    public BaseApiException(String errorCode, Object... args) {
        super(errorCode);
        this.errorCode = errorCode;
        this.args = args;
    }

    public BaseApiException(String errorCode, Throwable cause) {
        super(errorCode, cause);
        this.errorCode = errorCode;
        this.args = null;
    }

    public BaseApiException(String errorCode, Throwable cause, Object... args) {
        super(errorCode, cause);
        this.errorCode = errorCode;
        this.args = args;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public Object[] getArgs() {
        return args;
    }
}
