package com.spring.boot;

import com.spring.boot.dto.HotelDto;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.mapper.HotelMapper;
import com.spring.boot.model.Hotel;
import com.spring.boot.model.HotelImage;
import com.spring.boot.repository.HotelImageRepository;
import com.spring.boot.repository.HotelRepository;
import com.spring.boot.service.impl.HotelServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HotelCoverImageBatchTest {

    @Mock
    private HotelRepository hotelRepository;

    @Mock
    private HotelImageRepository hotelImageRepository;

    @Mock
    private BundleMessageService bundleMessageService;

    private HotelMapper hotelMapper;
    private HotelServiceImpl hotelService;

    @BeforeEach
    void setUp() {
        hotelMapper = Mappers.getMapper(HotelMapper.class);
        hotelService = new HotelServiceImpl(
                hotelRepository,
                hotelMapper,
                bundleMessageService,
                hotelImageRepository
        );
    }

    @Test
    void testGetAllHotelsPaginated_BatchLoadsImagesInSingleQueryAndAssignsFirstImage() {
        Hotel h1 = new Hotel();
        h1.setId(101L);
        h1.setName("Hotel 101");

        Hotel h2 = new Hotel();
        h2.setId(102L);
        h2.setName("Hotel 102");

        Hotel h3 = new Hotel();
        h3.setId(103L);
        h3.setName("Hotel 103");

        Pageable pageable = PageRequest.of(0, 20);
        Page<Hotel> hotelPage = new PageImpl<>(Arrays.asList(h1, h2, h3), pageable, 3);

        when(hotelRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(hotelPage);

        // Images for h1 (two images with sortOrder 0 and 1) and h2 (one image)
        HotelImage img1 = new HotelImage();
        img1.setId(1L);
        img1.setHotel(h1);
        img1.setUrl("https://images.example.com/h1_first.jpg");
        img1.setSortOrder(0);

        HotelImage img2 = new HotelImage();
        img2.setId(2L);
        img2.setHotel(h1);
        img2.setUrl("https://images.example.com/h1_second.jpg");
        img2.setSortOrder(1);

        HotelImage img3 = new HotelImage();
        img3.setId(3L);
        img3.setHotel(h2);
        img3.setUrl("https://images.example.com/h2_first.jpg");
        img3.setSortOrder(0);

        when(hotelImageRepository.findByHotelIdInAndRoomTypeIsNullOrderBySortOrderAscIdAsc(Arrays.asList(101L, 102L, 103L)))
                .thenReturn(Arrays.asList(img1, img2, img3));

        Page<HotelDto> result = hotelService.getAllHotelsPaginated(pageable, null, null, null, null);

        assertNotNull(result);
        assertEquals(3, result.getContent().size());

        // Hotel 1 has first image
        assertEquals("https://images.example.com/h1_first.jpg", result.getContent().get(0).getCoverImageUrl());
        // Hotel 2 has first image
        assertEquals("https://images.example.com/h2_first.jpg", result.getContent().get(1).getCoverImageUrl());
        // Hotel 3 has no images -> null
        assertNull(result.getContent().get(2).getCoverImageUrl());

        // Verify repository called exactly once for batch images
        verify(hotelImageRepository, times(1))
                .findByHotelIdInAndRoomTypeIsNullOrderBySortOrderAscIdAsc(Arrays.asList(101L, 102L, 103L));
    }

    @Test
    void testGetAllHotelsPaginated_EmptyPageSkipsImageQuery() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Hotel> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);

        when(hotelRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(emptyPage);

        Page<HotelDto> result = hotelService.getAllHotelsPaginated(pageable, null, null, null, null);

        assertNotNull(result);
        assertTrue(result.isEmpty());

        // Image query must be completely skipped
        verify(hotelImageRepository, never())
                .findByHotelIdInAndRoomTypeIsNullOrderBySortOrderAscIdAsc(any());
    }

    @Test
    void testGetHotelById_SetsCoverImageUrl() {
        Hotel h = new Hotel();
        h.setId(50L);
        h.setName("Single Hotel");

        when(hotelRepository.findById(50L)).thenReturn(Optional.of(h));

        HotelImage img = new HotelImage();
        img.setId(10L);
        img.setHotel(h);
        img.setUrl("https://images.example.com/cover.jpg");

        when(hotelImageRepository.findByHotelIdInAndRoomTypeIsNullOrderBySortOrderAscIdAsc(Collections.singletonList(50L)))
                .thenReturn(Collections.singletonList(img));

        HotelDto dto = hotelService.getHotelById(50L);
        assertNotNull(dto);
        assertEquals(50L, dto.getId());
        assertEquals("https://images.example.com/cover.jpg", dto.getCoverImageUrl());
    }

    @Test
    void testGetHotelById_NoImages_ReturnsNullCoverImage() {
        Hotel h = new Hotel();
        h.setId(51L);
        h.setName("Hotel Without Images");

        when(hotelRepository.findById(51L)).thenReturn(Optional.of(h));
        when(hotelImageRepository.findByHotelIdInAndRoomTypeIsNullOrderBySortOrderAscIdAsc(Collections.singletonList(51L)))
                .thenReturn(Collections.emptyList());

        HotelDto dto = hotelService.getHotelById(51L);
        assertNotNull(dto);
        assertEquals(51L, dto.getId());
        assertNull(dto.getCoverImageUrl());
    }
}
