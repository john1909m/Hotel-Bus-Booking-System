package com.spring.boot.exception;

/**
 * Exception thrown when a seat is already booked for a specific trip.
 */
public class SeatAlreadyBookedException extends RuntimeException {

    public SeatAlreadyBookedException(String message) {
        super(message);
    }
}