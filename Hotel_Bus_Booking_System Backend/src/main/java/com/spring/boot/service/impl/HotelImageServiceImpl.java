package com.spring.boot.service.impl;

import com.spring.boot.dto.HotelImageDto;
import com.spring.boot.dto.HotelImageRequest;
import com.spring.boot.enums.RoomType;
import com.spring.boot.exception.InvalidImageException;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.mapper.HotelImageMapper;
import com.spring.boot.model.Hotel;
import com.spring.boot.model.HotelImage;
import com.spring.boot.repository.HotelImageRepository;
import com.spring.boot.repository.HotelRepository;
import com.spring.boot.repository.RoomRepository;
import com.spring.boot.service.interfaces.HotelImageService;
import com.spring.boot.validator.ImageUrlValidator;
import lombok.AllArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;

/**
 * Service implementation for managing hotel and room gallery images.
 */
@Service
@AllArgsConstructor
public class HotelImageServiceImpl implements HotelImageService {

    private static final Logger logger = LoggerFactory.getLogger(HotelImageServiceImpl.class);

    private final HotelRepository hotelRepository;
    private final RoomRepository roomRepository;
    private final HotelImageRepository hotelImageRepository;
    private final HotelImageMapper hotelImageMapper;
    private final ImageUrlValidator imageUrlValidator;

    @Override
    @Transactional
    public HotelImageDto addImage(Long hotelId, HotelImageRequest request) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("error.hotel_not_found"));

        imageUrlValidator.validate(request.getUrl());

        RoomType roomTypeEnum = resolveAndValidateRoomType(hotelId, request.getRoomType());

        int sortOrder = request.getSortOrder() != null ? request.getSortOrder() : 0;

        HotelImage hotelImage = new HotelImage();
        hotelImage.setHotel(hotel);
        hotelImage.setUrl(request.getUrl().trim());
        hotelImage.setRoomType(roomTypeEnum);
        hotelImage.setSortOrder(sortOrder);

        HotelImage savedImage = hotelImageRepository.save(hotelImage);
        logger.info("Created hotel image id: {} for hotel id: {}", savedImage.getId(), hotelId);

        return hotelImageMapper.toDto(savedImage);
    }

    @Override
    @Transactional(readOnly = true)
    public List<HotelImageDto> getImages(Long hotelId, String roomType) {
        if (!hotelRepository.existsById(hotelId)) {
            throw new ResourceNotFoundException("error.hotel_not_found");
        }

        if (StringUtils.hasText(roomType)) {
            RoomType roomTypeEnum;
            try {
                roomTypeEnum = RoomType.valueOf(roomType.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                // If roomType is not a valid enum value, no matching room images exist
                return Collections.emptyList();
            }

            List<HotelImage> images = hotelImageRepository.findByHotelIdAndRoomTypeOrderBySortOrderAscIdAsc(hotelId, roomTypeEnum);
            return hotelImageMapper.toDtoList(images);
        }

        List<HotelImage> allImages = hotelImageRepository.findByHotelIdOrderBySortOrderAscIdAsc(hotelId);
        return hotelImageMapper.toDtoList(allImages);
    }

    @Override
    @Transactional
    public HotelImageDto updateImage(Long imageId, HotelImageRequest request) {
        HotelImage existingImage = hotelImageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("error.hotel_image_not_found"));

        imageUrlValidator.validate(request.getUrl());

        Long hotelId = existingImage.getHotel().getId();
        RoomType roomTypeEnum = resolveAndValidateRoomType(hotelId, request.getRoomType());

        existingImage.setUrl(request.getUrl().trim());
        existingImage.setRoomType(roomTypeEnum);
        if (request.getSortOrder() != null) {
            existingImage.setSortOrder(request.getSortOrder());
        }

        HotelImage updatedImage = hotelImageRepository.save(existingImage);
        logger.info("Updated hotel image id: {}", updatedImage.getId());

        return hotelImageMapper.toDto(updatedImage);
    }

    @Override
    @Transactional
    public void deleteImage(Long imageId) {
        HotelImage existingImage = hotelImageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("error.hotel_image_not_found"));

        hotelImageRepository.delete(existingImage);
        logger.info("Deleted hotel image id: {}", imageId);
    }

    private RoomType resolveAndValidateRoomType(Long hotelId, String roomType) {
        if (!StringUtils.hasText(roomType)) {
            return null;
        }

        RoomType roomTypeEnum;
        try {
            roomTypeEnum = RoomType.valueOf(roomType.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidImageException("error.room_type_not_found");
        }

        boolean roomTypeExists = roomRepository.existsByHotelIdAndRoomType(hotelId, roomTypeEnum);
        if (!roomTypeExists) {
            throw new InvalidImageException("error.room_type_not_found");
        }

        return roomTypeEnum;
    }
}
