package com.spring.boot.service.interfaces;

import com.spring.boot.dto.HotelImageDto;
import com.spring.boot.dto.HotelImageRequest;

import java.util.List;

/**
 * Service interface for Hotel gallery images.
 */
public interface HotelImageService {

    HotelImageDto addImage(Long hotelId, HotelImageRequest request);

    List<HotelImageDto> getImages(Long hotelId, String roomType);

    HotelImageDto updateImage(Long imageId, HotelImageRequest request);

    void deleteImage(Long imageId);
}
