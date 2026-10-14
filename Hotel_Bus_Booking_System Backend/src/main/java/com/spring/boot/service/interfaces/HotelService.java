package com.spring.boot.service.interfaces;

import com.spring.boot.dto.HotelDto;
import com.spring.boot.dto.HotelRequestDto;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;

import java.util.List;


public interface HotelService {

    HotelDto createHotel(HotelRequestDto hotelRequestDto);

    HotelDto getHotelById(Long id);

    List<HotelDto> getAllHotels();

    List<HotelDto> getHotelsByCity(String city);

    Page<HotelDto> getAllHotelsPaginated(Pageable pageable,
                                         String q, String city, Double minRating, Double maxPrice);

    List<HotelDto> lookupHotels(String query, Pageable pageable);

    HotelDto updateHotel(Long id, HotelRequestDto hotelRequestDto);

    void deleteHotel(Long id);
}