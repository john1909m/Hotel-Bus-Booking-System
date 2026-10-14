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

import java.util.List;
import java.util.stream.Collectors;


/**
 * Service implementation for Hotel entity.
 */
@Service
@AllArgsConstructor
public class HotelServiceImpl implements HotelService {

    private final HotelRepository hotelRepository;
    private final HotelMapper hotelMapper;
    private final BundleMessageService bundleMessageService;

    @Override
    public HotelDto createHotel(HotelRequestDto hotelRequestDto) {
        Hotel hotel = hotelMapper.hotelRequestDtoToHotel(hotelRequestDto);
        Hotel savedHotel = hotelRepository.save(hotel);
        return hotelMapper.hotelToHotelDto(savedHotel);
    }

    @Override
    public HotelDto getHotelById(Long id) {
        Hotel hotel = hotelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_not_found")));
        return hotelMapper.hotelToHotelDto(hotel);
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

        // Convert to DTO page
        return hotelPage.map(hotelMapper::hotelToHotelDto);
    }

    @Override
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
    public void deleteHotel(Long id) {
        if (!hotelRepository.existsById(id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_not_found"));
        }
        hotelRepository.deleteById(id);
    }
}