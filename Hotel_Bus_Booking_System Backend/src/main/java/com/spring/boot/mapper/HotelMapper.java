package com.spring.boot.mapper;

import com.spring.boot.dto.HotelDto;
import com.spring.boot.dto.HotelRequestDto;
import com.spring.boot.model.Hotel;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

/**
 * MapStruct mapper for Hotel entity and DTOs.
 */
@Mapper(componentModel = "spring")
public interface HotelMapper {

    HotelMapper INSTANCE = Mappers.getMapper(HotelMapper.class);

    Hotel hotelRequestDtoToHotel(HotelRequestDto hotelRequestDto);

    HotelDto hotelToHotelDto(Hotel hotel);
}