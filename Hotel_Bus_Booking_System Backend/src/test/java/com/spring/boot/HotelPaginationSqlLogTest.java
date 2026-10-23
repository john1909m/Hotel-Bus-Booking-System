package com.spring.boot;

import com.spring.boot.dto.HotelDto;
import com.spring.boot.service.interfaces.HotelService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class HotelPaginationSqlLogTest {

    @Autowired
    private HotelService hotelService;

    @Test
    void testHotelsPaginationWithCoverImages() {
        System.out.println("=== START SQL LOG: getAllHotelsPaginated ===");
        Page<HotelDto> page = hotelService.getAllHotelsPaginated(PageRequest.of(0, 20), null, null, null, null);
        System.out.println("=== END SQL LOG: getAllHotelsPaginated ===");

        assertNotNull(page);
        System.out.println("Loaded page elements: " + page.getNumberOfElements() + ", total: " + page.getTotalElements());
        page.getContent().forEach(h -> {
            System.out.println("Hotel ID=" + h.getId() + ", Name=" + h.getName() + ", coverImageUrl=" + h.getCoverImageUrl());
        });

        System.out.println("=== START SQL LOG: empty page ===");
        Page<HotelDto> emptyPage = hotelService.getAllHotelsPaginated(PageRequest.of(9999, 20), null, null, null, null);
        System.out.println("=== END SQL LOG: empty page ===");
        assertTrue(emptyPage.isEmpty());
    }
}
