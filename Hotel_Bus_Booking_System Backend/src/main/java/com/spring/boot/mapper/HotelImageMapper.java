package com.spring.boot.mapper;

import com.spring.boot.dto.HotelImageDto;
import com.spring.boot.model.HotelImage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

import java.util.List;

/**
 * MapStruct mapper for HotelImage entity and DTO.
 */
@Mapper(componentModel = "spring")
public interface HotelImageMapper {

    HotelImageMapper INSTANCE = Mappers.getMapper(HotelImageMapper.class);

    @Mapping(target = "hotelId", source = "hotel.id")
    HotelImageDto toDto(HotelImage hotelImage);

    List<HotelImageDto> toDtoList(List<HotelImage> hotelImages);
}
