package com.spring.boot.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

/**
 * Configuration class for Cloudflare R2 presigned URL generation using AWS S3 SDK v2.
 */
@Configuration
public class R2StorageConfig {

    private static final Logger logger = LoggerFactory.getLogger(R2StorageConfig.class);

    @Bean
    public S3Presigner s3Presigner(R2StorageProperties properties) {
        if (!properties.isEnabled() || !properties.isConfigured()) {
            logger.warn("Cloudflare R2 storage is not configured (missing CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY, CLOUDFLARE_R2_SECRET_KEY, or CLOUDFLARE_R2_BUCKET). Presigned upload URL generation will be disabled.");
            return null;
        }

        URI endpoint = URI.create("https://" + properties.getAccountId().trim() + ".r2.cloudflarestorage.com");

        S3Configuration s3Configuration = S3Configuration.builder()
                .pathStyleAccessEnabled(true)
                .build();

        return S3Presigner.builder()
                .endpointOverride(endpoint)
                .region(Region.of("auto"))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(properties.getAccessKey().trim(), properties.getSecretKey().trim())
                ))
                .serviceConfiguration(s3Configuration)
                .build();
    }
}
