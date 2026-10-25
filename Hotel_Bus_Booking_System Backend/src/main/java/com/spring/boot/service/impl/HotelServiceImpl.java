package com.spring.boot.service.impl;

import com.spring.boot.dto.HotelDto;
import com.spring.boot.dto.HotelRequestDto;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.Hotel;
import com.spring.boot.mapper.HotelMapper;
import com.spring.boot.repository.HotelRepository;
import com.spring.boot.repository.HotelSpecification;
import com.spring.boot.service.interfaces.HotelService;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.spring.boot.model.HotelImage;


import com.spring.boot.exception.BookingConflictException;
import com.spring.boot.repository.HotelBookingRepository;
import com.spring.boot.repository.RoomRepository;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service implementation for Hotel entity.
 */
@Service
@AllArgsConstructor
public class HotelServiceImpl implements HotelService {

    private final HotelRepository hotelRepository;
    private final HotelMapper hotelMapper;
    private final BundleMessageService bundleMessageService;
    private final com.spring.boot.repository.HotelImageRepository hotelImageRepository;
    private final RoomRepository roomRepository;
    private final HotelBookingRepository hotelBookingRepository;

    @Override
    @Transactional
    public HotelDto createHotel(HotelRequestDto hotelRequestDto) {
        Hotel hotel = hotelMapper.hotelRequestDtoToHotel(hotelRequestDto);
        Hotel savedHotel = hotelRepository.save(hotel);
        return hotelMapper.hotelToHotelDto(savedHotel);
    }

    @Override
    public HotelDto getHotelById(Long id) {
        Hotel hotel = hotelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_not_found")));
        HotelDto dto = hotelMapper.hotelToHotelDto(hotel);
        List<HotelImage> coverImages = hotelImageRepository
                .findByHotelIdInAndRoomTypeIsNullOrderBySortOrderAscIdAsc(Collections.singletonList(id));
        if (!coverImages.isEmpty()) {
            dto.setCoverImageUrl(coverImages.get(0).getUrl());
        }
        return dto;
    }

    @Override
    public java.util.List<HotelDto> getAllHotels() {
        return hotelRepository.findAll().stream()
                .map(hotelMapper::hotelToHotelDto)
                .toList();
    }

    @Override
    public List<HotelDto> getHotelsByCity(String city) {
        return hotelRepository.findByCityIgnoreCase(city, PageRequest.of(0, Integer.MAX_VALUE)).stream()
                .map(hotelMapper::hotelToHotelDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<HotelDto> lookupHotels(String query, Pageable pageable) {
        // Use repository method to find hotels by query with limit
        return hotelRepository.findByQueryLimit(
                query == null || query.isEmpty() ? "" : query,
                pageable
        ).stream()
                .map(hotelMapper::hotelToHotelDto)
                .toList();
    }

    @Override
    public Page<HotelDto> getAllHotelsPaginated(Pageable pageable,
                                                String q, String city, Double minRating, Double maxPrice) {
        // Build specification for filtering
        Specification<Hotel> spec = HotelSpecification.withFilters(q, city, minRating, maxPrice);

        // Get paginated results from repository
        Page<Hotel> hotelPage = hotelRepository.findAll(spec, pageable);

        // If the page is empty, skip the image query entirely
        if (hotelPage.isEmpty()) {
            return hotelPage.map(hotelMapper::hotelToHotelDto);
        }

        // Collect hotel ids of THAT page only
        List<Long> hotelIds = hotelPage.getContent().stream()
                .map(Hotel::getId)
                .toList();

        // Call repository ONCE with those ids
        List<HotelImage> coverImages = hotelImageRepository
                .findByHotelIdInAndRoomTypeIsNullOrderBySortOrderAscIdAsc(hotelIds);

        // Build Map<Long, String> keeping the FIRST image per hotel (ordered by sortOrder, id)
        Map<Long, String> coverByHotelId = new HashMap<>();
        for (HotelImage image : coverImages) {
            coverByHotelId.putIfAbsent(image.getHotel().getId(), image.getUrl());
        }

        // Map each hotel to HotelDto and set coverImageUrl
        return hotelPage.map(hotel -> {
            HotelDto dto = hotelMapper.hotelToHotelDto(hotel);
            dto.setCoverImageUrl(coverByHotelId.get(hotel.getId()));
            return dto;
        });
    }

    @Override
    @Transactional
    public HotelDto updateHotel(Long id, HotelRequestDto hotelRequestDto) {
        Hotel existingHotel = hotelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_not_found")));

        // Update fields
        existingHotel.setName(hotelRequestDto.getName());
        existingHotel.setDescription(hotelRequestDto.getDescription());
        existingHotel.setAddress(hotelRequestDto.getAddress());
        existingHotel.setCity(hotelRequestDto.getCity());
        existingHotel.setLatitude(hotelRequestDto.getLatitude());
        existingHotel.setLongitude(hotelRequestDto.getLongitude());
        existingHotel.setRating(hotelRequestDto.getRating());
        existingHotel.setCheckInTime(hotelRequestDto.getCheckInTime());
        existingHotel.setCheckOutTime(hotelRequestDto.getCheckOutTime());

        // Save hotel
        Hotel updatedHotel = hotelRepository.save(existingHotel);

        // Return DTO
        return hotelMapper.hotelToHotelDto(updatedHotel);
    }

    @Override
    @Transactional
    public void deleteHotel(Long id) {
        if (!hotelRepository.existsById(id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_not_found"));
        }
        if (roomRepository.existsByHotelId(id) || hotelBookingRepository.existsByHotelId(id)) {
            throw new BookingConflictException(bundleMessageService.getMessage("error.hotel_has_bookings"));
        }
        hotelImageRepository.deleteByHotelId(id);
        hotelRepository.deleteById(id);
    }
}