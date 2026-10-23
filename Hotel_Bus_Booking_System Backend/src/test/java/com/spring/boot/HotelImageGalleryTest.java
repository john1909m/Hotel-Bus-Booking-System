package com.spring.boot;

import com.spring.boot.dto.HotelImageDto;
import com.spring.boot.dto.HotelImageRequest;
import com.spring.boot.enums.RoomType;
import com.spring.boot.exception.GlobalExceptionHandler;
import com.spring.boot.exception.InvalidImageException;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.model.Hotel;
import com.spring.boot.model.HotelImage;
import com.spring.boot.model.Room;
import com.spring.boot.repository.HotelImageRepository;
import com.spring.boot.repository.HotelRepository;
import com.spring.boot.repository.RoomRepository;
import com.spring.boot.service.impl.HotelImageServiceImpl;
import com.spring.boot.mapper.HotelImageMapper;
import com.spring.boot.validator.ImageUrlValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HotelImageGalleryTest {

    private ImageUrlValidator validator;

    @Mock
    private HotelRepository hotelRepository;

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private HotelImageRepository hotelImageRepository;

    @Mock
    private HotelImageMapper hotelImageMapper;

    @InjectMocks
    private HotelImageServiceImpl hotelImageService;

    @BeforeEach
    void setUp() {
        validator = new ImageUrlValidator(Arrays.asList("images.example.com", "pub-cloudflare-r2.dev"));
        hotelImageService = new HotelImageServiceImpl(
                hotelRepository,
                roomRepository,
                hotelImageRepository,
                hotelImageMapper,
                validator
        );
    }

    // 1. URL VALIDATION TESTS
    @Test
    void testUrlValidator_ValidHttpsAllowedHost() {
        assertDoesNotThrow(() -> validator.validate("https://images.example.com/hotels/1/lobby.jpg"));
        assertDoesNotThrow(() -> validator.validate("https://pub-cloudflare-r2.dev/rooms/deluxe.png"));
        assertDoesNotThrow(() -> validator.validate("https://images.example.com:443/photo.jpg"));
    }

    @Test
    void testUrlValidator_RejectsHttpAndNonHttpsSchemes() {
        assertThrows(InvalidImageException.class, () -> validator.validate("http://images.example.com/pic.jpg"));
        assertThrows(InvalidImageException.class, () -> validator.validate("javascript:alert(1)"));
        assertThrows(InvalidImageException.class, () -> validator.validate("data:image/png;base64,iVBORw0KGgo"));
        assertThrows(InvalidImageException.class, () -> validator.validate("file:///etc/passwd"));
        assertThrows(InvalidImageException.class, () -> validator.validate("ftp://images.example.com/pic.jpg"));
    }

    @Test
    void testUrlValidator_RejectsDisallowedHost() {
        assertThrows(InvalidImageException.class, () -> validator.validate("https://evil.com/pic.jpg"));
        assertThrows(InvalidImageException.class, () -> validator.validate("https://malicious.images.example.com.attacker.com/pic.jpg"));
    }

    @Test
    void testUrlValidator_RejectsUserInfo() {
        assertThrows(InvalidImageException.class, () -> validator.validate("https://user:pass@images.example.com/pic.jpg"));
    }

    @Test
    void testUrlValidator_RejectsCustomPortsOtherThan443() {
        assertThrows(InvalidImageException.class, () -> validator.validate("https://images.example.com:8080/pic.jpg"));
        assertThrows(InvalidImageException.class, () -> validator.validate("https://images.example.com:8443/pic.jpg"));
    }

    @Test
    void testUrlValidator_RejectsBlankAndTooLong() {
        assertThrows(InvalidImageException.class, () -> validator.validate(""));
        assertThrows(InvalidImageException.class, () -> validator.validate("   "));
        assertThrows(InvalidImageException.class, () -> validator.validate(null));

        String longUrl = "https://images.example.com/" + "a".repeat(2050);
        assertThrows(InvalidImageException.class, () -> validator.validate(longUrl));
    }

    // 2. SERVICE LOGIC TESTS
    @Test
    void testAddHotelLevelImage_Success() {
        Hotel hotel = new Hotel();
        hotel.setId(1L);

        when(hotelRepository.findById(1L)).thenReturn(Optional.of(hotel));

        HotelImage savedEntity = new HotelImage();
        savedEntity.setId(10L);
        savedEntity.setHotel(hotel);
        savedEntity.setUrl("https://images.example.com/lobby.jpg");
        savedEntity.setSortOrder(0);
        savedEntity.setRoomType(null);

        when(hotelImageRepository.save(any(HotelImage.class))).thenReturn(savedEntity);

        HotelImageDto dto = new HotelImageDto(10L, 1L, null, "https://images.example.com/lobby.jpg", 0);
        when(hotelImageMapper.toDto(savedEntity)).thenReturn(dto);

        HotelImageRequest request = new HotelImageRequest("https://images.example.com/lobby.jpg", null, 0);
        HotelImageDto result = hotelImageService.addImage(1L, request);

        assertNotNull(result);
        assertEquals(10L, result.getId());
        assertNull(result.getRoomType());
        verify(hotelImageRepository, times(1)).save(any(HotelImage.class));
    }

    @Test
    void testAddRoomTypeImage_Success_WhenRoomTypeExistsInHotel() {
        Hotel hotel = new Hotel();
        hotel.setId(1L);

        when(hotelRepository.findById(1L)).thenReturn(Optional.of(hotel));
        when(roomRepository.existsByHotelIdAndRoomType(1L, RoomType.DOUBLE)).thenReturn(true);

        HotelImage savedEntity = new HotelImage();
        savedEntity.setId(11L);
        savedEntity.setHotel(hotel);
        savedEntity.setUrl("https://images.example.com/double.jpg");
        savedEntity.setSortOrder(1);
        savedEntity.setRoomType(RoomType.DOUBLE);

        when(hotelImageRepository.save(any(HotelImage.class))).thenReturn(savedEntity);

        HotelImageDto dto = new HotelImageDto(11L, 1L, RoomType.DOUBLE, "https://images.example.com/double.jpg", 1);
        when(hotelImageMapper.toDto(savedEntity)).thenReturn(dto);

        HotelImageRequest request = new HotelImageRequest("https://images.example.com/double.jpg", "DOUBLE", 1);
        HotelImageDto result = hotelImageService.addImage(1L, request);

        assertNotNull(result);
        assertEquals(RoomType.DOUBLE, result.getRoomType());
        verify(roomRepository, times(1)).existsByHotelIdAndRoomType(1L, RoomType.DOUBLE);
    }

    @Test
    void testAddRoomTypeImage_ThrowsException_WhenRoomTypeNotInHotel() {
        Hotel hotel = new Hotel();
        hotel.setId(1L);

        when(hotelRepository.findById(1L)).thenReturn(Optional.of(hotel));
        // Hotel 1 does NOT have DELUXE rooms
        when(roomRepository.existsByHotelIdAndRoomType(1L, RoomType.DELUXE)).thenReturn(false);

        HotelImageRequest request = new HotelImageRequest("https://images.example.com/deluxe.jpg", "DELUXE", 0);

        InvalidImageException ex = assertThrows(InvalidImageException.class,
                () -> hotelImageService.addImage(1L, request));
        assertEquals("error.room_type_not_found", ex.getMessage());
        verify(hotelImageRepository, never()).save(any());
    }

    @Test
    void testAddRoomTypeImage_ThrowsException_WhenRoomTypeInvalidString() {
        Hotel hotel = new Hotel();
        hotel.setId(1L);

        when(hotelRepository.findById(1L)).thenReturn(Optional.of(hotel));

        HotelImageRequest request = new HotelImageRequest("https://images.example.com/pic.jpg", "NON_EXISTENT_TYPE", 0);

        InvalidImageException ex = assertThrows(InvalidImageException.class,
                () -> hotelImageService.addImage(1L, request));
        assertEquals("error.room_type_not_found", ex.getMessage());
    }

    @Test
    void testGetImages_OmittedRoomType_ReturnsAllImages() {
        when(hotelRepository.existsById(1L)).thenReturn(true);

        HotelImage img1 = new HotelImage();
        img1.setId(1L);
        HotelImage img2 = new HotelImage();
        img2.setId(2L);

        when(hotelImageRepository.findByHotelIdOrderBySortOrderAscIdAsc(1L)).thenReturn(Arrays.asList(img1, img2));

        HotelImageDto dto1 = new HotelImageDto(1L, 1L, null, "https://images.example.com/1.jpg", 0);
        HotelImageDto dto2 = new HotelImageDto(2L, 1L, RoomType.DOUBLE, "https://images.example.com/2.jpg", 1);
        when(hotelImageMapper.toDtoList(anyList())).thenReturn(Arrays.asList(dto1, dto2));

        List<HotelImageDto> results = hotelImageService.getImages(1L, null);
        assertEquals(2, results.size());
        verify(hotelImageRepository, times(1)).findByHotelIdOrderBySortOrderAscIdAsc(1L);
    }

    @Test
    void testGetImages_FilteredByRoomType_ReturnsOnlyThatType() {
        when(hotelRepository.existsById(1L)).thenReturn(true);

        HotelImage img = new HotelImage();
        img.setId(2L);
        img.setRoomType(RoomType.DOUBLE);

        when(hotelImageRepository.findByHotelIdAndRoomTypeOrderBySortOrderAscIdAsc(1L, RoomType.DOUBLE))
                .thenReturn(Collections.singletonList(img));

        HotelImageDto dto = new HotelImageDto(2L, 1L, RoomType.DOUBLE, "https://images.example.com/2.jpg", 1);
        when(hotelImageMapper.toDtoList(anyList())).thenReturn(Collections.singletonList(dto));

        List<HotelImageDto> results = hotelImageService.getImages(1L, "DOUBLE");
        assertEquals(1, results.size());
        assertEquals(RoomType.DOUBLE, results.get(0).getRoomType());
        verify(hotelImageRepository, times(1))
                .findByHotelIdAndRoomTypeOrderBySortOrderAscIdAsc(1L, RoomType.DOUBLE);
    }

    @Test
    void testDeleteImage_Success_AndSecondDeleteThrows404() {
        HotelImage image = new HotelImage();
        image.setId(5L);

        when(hotelImageRepository.findById(5L)).thenReturn(Optional.of(image));

        // First delete succeeds
        assertDoesNotThrow(() -> hotelImageService.deleteImage(5L));
        verify(hotelImageRepository, times(1)).delete(image);

        // Second delete: image no longer found
        when(hotelImageRepository.findById(5L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> hotelImageService.deleteImage(5L));
    }

    // 3. EXCEPTION HANDLER VERIFICATION
    @Test
    void testGlobalExceptionHandler_InvalidImageException() {
        com.spring.boot.helper.BundleMessageService bundleService = mock(com.spring.boot.helper.BundleMessageService.class);
        when(bundleService.getMessage("error.invalid_image_url")).thenReturn("Translated: error.invalid_image_url");

        GlobalExceptionHandler handler = new GlobalExceptionHandler(bundleService);
        InvalidImageException ex = new InvalidImageException("error.invalid_image_url");

        ResponseEntity<String> response = handler.handleInvalidImageException(ex);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Translated: error.invalid_image_url", response.getBody());
    }

    @Test
    void testGlobalExceptionHandler_AccessDeniedException() {
        com.spring.boot.helper.BundleMessageService bundleService = mock(com.spring.boot.helper.BundleMessageService.class);
        when(bundleService.getMessage("Access denied")).thenReturn("Translated: Access denied");

        GlobalExceptionHandler handler = new GlobalExceptionHandler(bundleService);
        AccessDeniedException ex = new AccessDeniedException("Access denied");

        ResponseEntity<String> response = handler.handleAccessDeniedException(ex);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("Translated: Access denied", response.getBody());
    }
}
