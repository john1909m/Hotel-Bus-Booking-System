package com.spring.boot.mapper;

import com.spring.boot.dto.HotelBookingDto;
import com.spring.boot.dto.HotelBookingRequestDto;
import com.spring.boot.model.HotelBooking;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

/**
 * MapStruct mapper for HotelBooking entity and DTOs.
 */
@Mapper
public interface HotelBookingMapper {

    HotelBookingMapper INSTANCE = Mappers.getMapper(HotelBookingMapper.class);

    HotelBooking hotelBookingRequestDtoToHotelBooking(HotelBookingRequestDto hotelBookingRequestDto);

    HotelBookingDto hotelBookingToHotelBookingDto(HotelBooking hotelBooking);
}