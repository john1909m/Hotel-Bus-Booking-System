package com.spring.boot.exception;

import lombok.Getter;

/**
 * Exception thrown when analytics request parameters violate business validation rules.
 * Carries field name and i18n message key to return structured field-level 400 errors.
 */
@Getter
public class AnalyticsValidationException extends RuntimeException {

    private final String field;
    private final String messageKey;

    public AnalyticsValidationException(String field, String messageKey) {
        super(messageKey);
        this.field = field;
        this.messageKey = messageKey;
    }
}
