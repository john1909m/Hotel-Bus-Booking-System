package com.spring.boot.exception;

/**
 * Exception thrown when image validation fails (e.g. invalid URL, disallowed host, invalid room type).
 */
public class InvalidImageException extends RuntimeException {

    public InvalidImageException(String message) {
        super(message);
    }

    public InvalidImageException(String message, Throwable cause) {
        super(message, cause);
    }
}
