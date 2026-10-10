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
@Mapper(componentModel = "spring")
public interface HotelBookingMapper {

    HotelBookingMapper INSTANCE = Mappers.getMapper(HotelBookingMapper.class);

    HotelBooking hotelBookingRequestDtoToHotelBooking(HotelBookingRequestDto hotelBookingRequestDto);

    @Mapping(target = "userId", source = "costumer.id")
    @Mapping(source = "room.id", target = "roomId")
    @Mapping(source = "hotel.id", target = "hotelId")
    HotelBookingDto hotelBookingToHotelBookingDto(HotelBooking hotelBooking);
}