package com.spring.boot.exception;

/**
 * Exception thrown when a bus trip is not available.
 */
public class BusTripUnavailableException extends RuntimeException {

    public BusTripUnavailableException(String message) {
        super(message);
    }
}