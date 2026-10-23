package com.spring.boot.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

/**
 * Configuration properties for Cloudflare R2 storage.
 * Supports both access-key / secret-key / public-url and access-key-id / secret-access-key / public-base-url.
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "app.storage")
public class R2StorageProperties {

    /**
     * Whether Cloudflare R2 storage feature is enabled.
     */
    private boolean enabled = true;

    /**
     * Cloudflare account ID.
     */
    private String accountId;

    /**
     * Cloudflare R2 bucket name.
     */
    private String bucket;

    /**
     * Public URL / base URL for uploaded images.
     */
    private String publicUrl;
    private String publicBaseUrl;

    /**
     * Presigned upload URL TTL in seconds (default 300, max 900).
     */
    private int uploadUrlTtlSeconds = 300;

    /**
     * Cloudflare R2 S3 access key ID.
     */
    private String accessKey;
    private String accessKeyId;

    /**
     * Cloudflare R2 S3 secret access key.
     */
    private String secretKey;
    private String secretAccessKey;

    public String getAccessKey() {
        return StringUtils.hasText(accessKey) ? accessKey : accessKeyId;
    }

    public String getSecretKey() {
        return StringUtils.hasText(secretKey) ? secretKey : secretAccessKey;
    }

    public String getPublicUrl() {
        return StringUtils.hasText(publicUrl) ? publicUrl : publicBaseUrl;
    }

    /**
     * Checks if all required R2 configuration properties are present.
     */
    public boolean isConfigured() {
        return enabled
                && StringUtils.hasText(accountId)
                && StringUtils.hasText(getAccessKey())
                && StringUtils.hasText(getSecretKey())
                && StringUtils.hasText(bucket);
    }
}
