package com.spring.boot.exception;

/**
 * Exception thrown when a room is not available for booking.
 */
public class RoomUnavailableException extends BaseApiException {

    public RoomUnavailableException(String errorCode) {
        super(errorCode);
    }

    public RoomUnavailableException(String errorCode, Object... args) {
        super(errorCode, args);
    }

    public RoomUnavailableException(String errorCode, Throwable cause) {
        super(errorCode, cause);
    }

    public RoomUnavailableException(String errorCode, Throwable cause, Object... args) {
        super(errorCode, cause, args);
    }
}
