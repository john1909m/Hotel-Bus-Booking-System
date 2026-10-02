package com.spring.boot.service.interfaces;

import com.spring.boot.dto.HotelDto;
import com.spring.boot.dto.HotelRequestDto;

import java.util.List;



/**
 * Service interface for Hotel entity.
 */
public interface HotelService {

    HotelDto createHotel(HotelRequestDto hotelRequestDto);

    HotelDto getHotelById(Long id);

    List<HotelDto> getAllHotels();

    HotelDto updateHotel(Long id, HotelRequestDto hotelRequestDto);

    void deleteHotel(Long id);
}