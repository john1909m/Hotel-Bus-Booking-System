package com.spring.boot.exception;

/**
 * Exception thrown when a route-trip relationship is invalid.
 */
public class InvalidRouteTripRelationshipException extends BaseApiException {

    public InvalidRouteTripRelationshipException(String errorCode) {
        super(errorCode);
    }

    public InvalidRouteTripRelationshipException(String errorCode, Object... args) {
        super(errorCode, args);
    }

    public InvalidRouteTripRelationshipException(String errorCode, Throwable cause) {
        super(errorCode, cause);
    }
}
