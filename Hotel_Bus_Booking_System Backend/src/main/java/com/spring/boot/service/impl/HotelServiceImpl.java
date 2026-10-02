package com.spring.boot.service.impl;

import com.spring.boot.dto.HotelDto;
import com.spring.boot.dto.HotelRequestDto;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.Hotel;
import com.spring.boot.mapper.HotelMapper;
import com.spring.boot.repository.HotelRepository;
import com.spring.boot.service.interfaces.HotelService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;


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