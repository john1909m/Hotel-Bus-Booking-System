package com.spring.boot.exception;

/**
 * Exception thrown when there is an invalid route/trip relationship.
 */
public class InvalidRouteTripRelationshipException extends RuntimeException {

    public InvalidRouteTripRelationshipException(String message) {
        super(message);
    }
}