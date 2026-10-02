package com.spring.boot.helper;

import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;

/**
 * Service for retrieving localized messages from message bundles.
 */
@Service
public class BundleMessageService {

    private final MessageSource messageSource;

    public BundleMessageService(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    /**
     * Gets a localized message by its key.
     *
     * @param key the message key
     * @return the localized message
     */
    public String getMessage(String key) {
        return messageSource.getMessage(key, null, LocaleContextHolder.getLocale());
    }

    /**
     * Gets a localized message by its key with arguments.
     *
     * @param key      the message key
     * @param args     the message arguments
     * @return the localized message
     */
    public String getMessage(String key, Object[] args) {
        return messageSource.getMessage(key, args, LocaleContextHolder.getLocale());
    }
}