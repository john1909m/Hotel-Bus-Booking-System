package com.spring.boot.exception;

/**
 * Exception thrown when a room is not available for the requested dates.
 */
public class RoomUnavailableException extends RuntimeException {

    public RoomUnavailableException(String message) {
        super(message);
    }
}