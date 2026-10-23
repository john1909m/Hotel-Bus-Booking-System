package com.spring.boot.service.impl;

import com.spring.boot.config.R2StorageProperties;
import com.spring.boot.dto.ImageUploadUrlRequest;
import com.spring.boot.dto.ImageUploadUrlResponse;
import com.spring.boot.enums.RoomType;
import com.spring.boot.exception.InvalidImageException;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.repository.HotelRepository;
import com.spring.boot.repository.RoomRepository;
import com.spring.boot.service.interfaces.ImageUploadService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Service implementation for generating S3/R2 presigned upload URLs for hotel images.
 */
@Service
public class ImageUploadServiceImpl implements ImageUploadService {

    private static final Logger logger = LoggerFactory.getLogger(ImageUploadServiceImpl.class);

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final HotelRepository hotelRepository;
    private final RoomRepository roomRepository;
    private final R2StorageProperties properties;
    private final S3Presigner s3Presigner;

    @Autowired
    public ImageUploadServiceImpl(
            HotelRepository hotelRepository,
            RoomRepository roomRepository,
            R2StorageProperties properties,
            @Autowired(required = false) S3Presigner s3Presigner) {
        this.hotelRepository = hotelRepository;
        this.roomRepository = roomRepository;
        this.properties = properties;
        this.s3Presigner = s3Presigner;
    }

    @Override
    public ImageUploadUrlResponse createUploadUrl(ImageUploadUrlRequest request) {
        if (!properties.isEnabled() || s3Presigner == null) {
            throw new InvalidImageException("error.storage_disabled");
        }

        Long hotelId = request.getHotelId();
        if (hotelId == null || !hotelRepository.existsById(hotelId)) {
            throw new ResourceNotFoundException("error.hotel_not_found");
        }

        validateRoomType(hotelId, request.getRoomType());

        String rawContentType = request.getContentType();
        if (!StringUtils.hasText(rawContentType)) {
            throw new InvalidImageException("error.invalid_content_type");
        }
        String normalizedContentType = rawContentType.trim().toLowerCase();
        if (!ALLOWED_CONTENT_TYPES.contains(normalizedContentType)) {
            throw new InvalidImageException("error.invalid_content_type");
        }

        String extension = getExtension(normalizedContentType);
        String category = slug(request.getRoomType());
        String objectKey = "hotels/" + hotelId + "/" + category + "/" + UUID.randomUUID() + "." + extension;

        String base = properties.getPublicUrl() != null
                ? properties.getPublicUrl().trim().replaceAll("/+$", "")
                : "";
        String publicUrl = base + "/" + objectKey;

        int ttl = Math.min(Math.max(properties.getUploadUrlTtlSeconds(), 60), 900);

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(properties.getBucket())
                .key(objectKey)
                .contentType(normalizedContentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(ttl))
                .putObjectRequest(putObjectRequest)
                .build();

        PresignedPutObjectRequest presignedPutObjectRequest = s3Presigner.presignPutObject(presignRequest);
        String uploadUrl = presignedPutObjectRequest.url().toString();

        // Safe logging: log ONLY hotelId and contentType at DEBUG level, never the URL, key, or credentials
        logger.debug("Generated presigned upload URL for hotelId: {}, contentType: {}", hotelId, normalizedContentType);

        return new ImageUploadUrlResponse(
                uploadUrl,
                publicUrl,
                ttl,
                "PUT",
                Map.of("Content-Type", normalizedContentType)
        );
    }

    private void validateRoomType(Long hotelId, String roomType) {
        if (!StringUtils.hasText(roomType)) {
            return;
        }

        RoomType roomTypeEnum;
        try {
            roomTypeEnum = RoomType.valueOf(roomType.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidImageException("error.room_type_not_found");
        }

        boolean exists = roomRepository.existsByHotelIdAndRoomType(hotelId, roomTypeEnum);
        if (!exists) {
            throw new InvalidImageException("error.room_type_not_found");
        }
    }

    public static String slug(String input) {
        if (input == null || input.isBlank()) {
            return "gallery";
        }
        String normalized = input.trim().toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return normalized.isEmpty() ? "gallery" : normalized;
    }

    private String getExtension(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> throw new InvalidImageException("error.invalid_content_type");
        };
    }
}
