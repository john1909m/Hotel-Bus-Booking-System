package com.spring.boot.service.interfaces;

import com.spring.boot.dto.ImageUploadUrlRequest;
import com.spring.boot.dto.ImageUploadUrlResponse;

/**
 * Service interface for generating presigned image upload URLs.
 */
public interface ImageUploadService {

    ImageUploadUrlResponse createUploadUrl(ImageUploadUrlRequest request);
}
