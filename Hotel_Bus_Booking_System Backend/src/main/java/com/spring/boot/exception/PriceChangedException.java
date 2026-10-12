package com.spring.boot.exception;

import java.math.BigDecimal;

/**
 * Exception thrown when the price has changed between draft creation and confirmation.
 */
public class PriceChangedException extends RuntimeException {
    private final BigDecimal newPrice;

    public PriceChangedException(String message, BigDecimal newPrice) {
        super(message);
        this.newPrice = newPrice;
    }

    public PriceChangedException(String message, Throwable cause, BigDecimal newPrice) {
        super(message, cause);
        this.newPrice = newPrice;
    }

    public BigDecimal getNewPrice() {
        return newPrice;
    }
}