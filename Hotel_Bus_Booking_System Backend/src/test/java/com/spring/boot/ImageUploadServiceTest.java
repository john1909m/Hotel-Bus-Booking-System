package com.spring.boot;

import com.spring.boot.config.R2StorageConfig;
import com.spring.boot.config.R2StorageProperties;
import com.spring.boot.dto.ImageUploadUrlRequest;
import com.spring.boot.dto.ImageUploadUrlResponse;
import com.spring.boot.enums.RoomType;
import com.spring.boot.exception.InvalidImageException;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.repository.HotelRepository;
import com.spring.boot.repository.RoomRepository;
import com.spring.boot.service.impl.ImageUploadServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URL;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImageUploadServiceTest {

    @Mock
    private HotelRepository hotelRepository;

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private S3Presigner s3Presigner;

    private R2StorageProperties properties;
    private ImageUploadServiceImpl imageUploadService;

    @BeforeEach
    void setUp() {
        properties = new R2StorageProperties();
        properties.setEnabled(true);
        properties.setAccountId("test-account-id");
        properties.setBucket("test-bucket");
        properties.setPublicBaseUrl("https://images.example.com");
        properties.setUploadUrlTtlSeconds(300);
        properties.setAccessKeyId("test-access-key");
        properties.setSecretAccessKey("test-secret-key");

        imageUploadService = new ImageUploadServiceImpl(
                hotelRepository,
                roomRepository,
                properties,
                s3Presigner
        );
    }

    @Test
    void testCreateUploadUrl_Success_WithRoomType() throws Exception {
        when(hotelRepository.existsById(1L)).thenReturn(true);
        when(roomRepository.existsByHotelIdAndRoomType(1L, RoomType.DOUBLE)).thenReturn(true);

        PresignedPutObjectRequest mockPresigned = mock(PresignedPutObjectRequest.class);
        when(mockPresigned.url()).thenReturn(new URL("https://test-account-id.r2.cloudflarestorage.com/test-bucket/hotels/1/double/test.webp?X-Amz-Signature=abc"));
        when(s3Presigner.presignPutObject(any(PutObjectPresignRequest.class))).thenReturn(mockPresigned);

        ImageUploadUrlRequest request = new ImageUploadUrlRequest(1L, "DOUBLE", "image/webp");
        ImageUploadUrlResponse response = imageUploadService.createUploadUrl(request);

        assertNotNull(response);
        assertEquals("PUT", response.getMethod());
        assertEquals(300, response.getExpiresInSeconds());
        assertEquals(mockPresigned.url().toString(), response.getUploadUrl());
        assertTrue(response.getPublicUrl().startsWith("https://images.example.com/hotels/1/double/"));
        assertTrue(response.getPublicUrl().endsWith(".webp"));
        assertEquals("image/webp", response.getRequiredHeaders().get("Content-Type"));

        ArgumentCaptor<PutObjectPresignRequest> captor = ArgumentCaptor.forClass(PutObjectPresignRequest.class);
        verify(s3Presigner).presignPutObject(captor.capture());
        PutObjectPresignRequest captured = captor.getValue();
        assertEquals("test-bucket", captured.putObjectRequest().bucket());
        assertEquals("image/webp", captured.putObjectRequest().contentType());
        assertTrue(captured.putObjectRequest().key().startsWith("hotels/1/double/"));
        assertTrue(captured.putObjectRequest().key().endsWith(".webp"));
    }

    @Test
    void testCreateUploadUrl_Success_HotelLevel_RoomTypeNull() throws Exception {
        when(hotelRepository.existsById(2L)).thenReturn(true);

        PresignedPutObjectRequest mockPresigned = mock(PresignedPutObjectRequest.class);
        when(mockPresigned.url()).thenReturn(new URL("https://test-account-id.r2.cloudflarestorage.com/test-bucket/hotels/2/gallery/test.jpg?sig=123"));
        when(s3Presigner.presignPutObject(any(PutObjectPresignRequest.class))).thenReturn(mockPresigned);

        ImageUploadUrlRequest request = new ImageUploadUrlRequest(2L, null, "image/jpeg");
        ImageUploadUrlResponse response = imageUploadService.createUploadUrl(request);

        assertNotNull(response);
        assertTrue(response.getPublicUrl().startsWith("https://images.example.com/hotels/2/gallery/"));
        assertTrue(response.getPublicUrl().endsWith(".jpg"));
        assertEquals("image/jpeg", response.getRequiredHeaders().get("Content-Type"));
        verify(roomRepository, never()).existsByHotelIdAndRoomType(any(), any());
    }

    @Test
    void testCreateUploadUrl_InvalidContentType_Throws400() {
        when(hotelRepository.existsById(1L)).thenReturn(true);

        ImageUploadUrlRequest requestGif = new ImageUploadUrlRequest(1L, null, "image/gif");
        assertThrows(InvalidImageException.class, () -> imageUploadService.createUploadUrl(requestGif));

        ImageUploadUrlRequest requestHtml = new ImageUploadUrlRequest(1L, null, "text/html");
        assertThrows(InvalidImageException.class, () -> imageUploadService.createUploadUrl(requestHtml));
    }

    @Test
    void testCreateUploadUrl_HotelNotFound_Throws404() {
        when(hotelRepository.existsById(999L)).thenReturn(false);

        ImageUploadUrlRequest request = new ImageUploadUrlRequest(999L, null, "image/png");
        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> imageUploadService.createUploadUrl(request));
        assertEquals("error.hotel_not_found", ex.getMessage());
    }

    @Test
    void testCreateUploadUrl_RoomTypeNotExistingInHotel_Throws400() {
        when(hotelRepository.existsById(1L)).thenReturn(true);
        when(roomRepository.existsByHotelIdAndRoomType(1L, RoomType.DELUXE)).thenReturn(false);

        ImageUploadUrlRequest request = new ImageUploadUrlRequest(1L, "DELUXE", "image/png");
        InvalidImageException ex = assertThrows(InvalidImageException.class,
                () -> imageUploadService.createUploadUrl(request));
        assertEquals("error.room_type_not_found", ex.getMessage());
    }

    @Test
    void testCreateUploadUrl_InvalidRoomTypeString_Throws400() {
        when(hotelRepository.existsById(1L)).thenReturn(true);

        ImageUploadUrlRequest request = new ImageUploadUrlRequest(1L, "NON_EXISTENT", "image/png");
        InvalidImageException ex = assertThrows(InvalidImageException.class,
                () -> imageUploadService.createUploadUrl(request));
        assertEquals("error.room_type_not_found", ex.getMessage());
    }

    @Test
    void testCreateUploadUrl_StorageDisabled_Throws400() {
        properties.setEnabled(false);
        ImageUploadUrlRequest request = new ImageUploadUrlRequest(1L, null, "image/jpeg");
        InvalidImageException ex = assertThrows(InvalidImageException.class,
                () -> imageUploadService.createUploadUrl(request));
        assertEquals("error.storage_disabled", ex.getMessage());
    }

    @Test
    void testSlugMethod() {
        assertEquals("gallery", ImageUploadServiceImpl.slug(null));
        assertEquals("gallery", ImageUploadServiceImpl.slug(""));
        assertEquals("double", ImageUploadServiceImpl.slug("DOUBLE"));
        assertEquals("deluxe-room", ImageUploadServiceImpl.slug("Deluxe Room"));
        assertEquals("suite-pool", ImageUploadServiceImpl.slug("Suite & Pool!"));
        assertEquals("gallery", ImageUploadServiceImpl.slug("---"));
    }

    @Test
    void testR2StorageConfig_MissingCredentials_ReturnsNullSafely() {
        R2StorageConfig config = new R2StorageConfig();
        R2StorageProperties invalidProps = new R2StorageProperties();
        invalidProps.setEnabled(true);
        // Missing accountId, accessKey, secretKey

        S3Presigner presigner = config.s3Presigner(invalidProps);
        assertNull(presigner, "S3Presigner should be null so backend can boot without storage credentials");
    }

    @Test
    void testR2StorageConfig_ValidCredentials_BuildsPresigner() {
        R2StorageConfig config = new R2StorageConfig();
        R2StorageProperties validProps = new R2StorageProperties();
        validProps.setEnabled(true);
        validProps.setAccountId("abc123def456");
        validProps.setBucket("my-bucket");
        validProps.setAccessKey("access-key-id");
        validProps.setSecretKey("secret-access-key");

        S3Presigner presigner = config.s3Presigner(validProps);
        assertNotNull(presigner);
        presigner.close();
    }
}
