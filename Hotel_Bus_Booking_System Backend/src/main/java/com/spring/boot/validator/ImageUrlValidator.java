package com.spring.boot.validator;

import com.spring.boot.exception.InvalidImageException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Validates image URLs before saving to ensure security and compliance:
 * - Absolute URL with HTTPS only
 * - Host matches the configured allowlist (app.images.allowed-hosts)
 * - Max length 2048, not blank
 * - No userinfo, no port other than 443
 */
@Component
public class ImageUrlValidator {

    private final List<String> allowedHosts;

    public ImageUrlValidator(@Value("${app.images.allowed-hosts:}") List<String> allowedHosts) {
        List<String> hosts = new ArrayList<>();
        if (allowedHosts != null) {
            for (String entry : allowedHosts) {
                if (StringUtils.hasText(entry)) {
                    // In case a comma-separated string was supplied or list item contains commas
                    String[] parts = entry.split(",");
                    for (String part : parts) {
                        String trimmed = part.trim();
                        if (StringUtils.hasText(trimmed)) {
                            hosts.add(trimmed.toLowerCase());
                        }
                    }
                }
            }
        }
        this.allowedHosts = hosts;
    }

    /**
     * Validates the provided image URL.
     *
     * @param url the URL to validate
     * @throws InvalidImageException if validation fails
     */
    public void validate(String url) {
        if (!StringUtils.hasText(url) || url.length() > 2048) {
            throw new InvalidImageException("error.invalid_image_url");
        }

        String trimmedUrl = url.trim();

        URI uri;
        try {
            uri = new URI(trimmedUrl);
        } catch (URISyntaxException e) {
            throw new InvalidImageException("error.invalid_image_url");
        }

        if (!uri.isAbsolute() || !"https".equalsIgnoreCase(uri.getScheme())) {
            throw new InvalidImageException("error.invalid_image_url");
        }

        if (uri.getUserInfo() != null || (uri.getRawAuthority() != null && uri.getRawAuthority().contains("@"))) {
            throw new InvalidImageException("error.invalid_image_url");
        }

        int port = uri.getPort();
        if (port != -1 && port != 443) {
            throw new InvalidImageException("error.invalid_image_url");
        }

        String host = uri.getHost();
        if (!StringUtils.hasText(host)) {
            throw new InvalidImageException("error.invalid_image_url");
        }

        String normalizedHost = host.trim().toLowerCase();
        boolean isAllowed = allowedHosts.stream().anyMatch(allowed -> allowed.equalsIgnoreCase(normalizedHost));

        if (!isAllowed) {
            throw new InvalidImageException("error.image_host_not_allowed");
        }
    }

    public List<String> getAllowedHosts() {
        return allowedHosts;
    }
}
