package com.spring.boot.exception;

import java.math.BigDecimal;

/**
 * Exception thrown when the price has changed between draft creation and confirmation.
 */
public class PriceChangedException extends BaseApiException {

    private final BigDecimal newPrice;

    public PriceChangedException(String errorCode, BigDecimal newPrice) {
        super(errorCode);
        this.newPrice = newPrice;
    }

    public PriceChangedException(String errorCode, Throwable cause, BigDecimal newPrice) {
        super(errorCode, cause);
        this.newPrice = newPrice;
    }

    public BigDecimal getNewPrice() {
        return newPrice;
    }
}
