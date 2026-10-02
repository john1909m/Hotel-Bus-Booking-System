package com.spring.boot.mapper;

import com.spring.boot.dto.HotelBusStopDto;
import com.spring.boot.dto.HotelBusStopRequestDto;
import com.spring.boot.model.HotelBusStop;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

/**
 * MapStruct mapper for HotelBusStop entity and DTOs.
 */
@Mapper
public interface HotelBusStopMapper {

    HotelBusStopMapper INSTANCE = Mappers.getMapper(HotelBusStopMapper.class);

    HotelBusStop hotelBusStopRequestDtoToHotelBusStop(HotelBusStopRequestDto hotelBusStopRequestDto);

    HotelBusStopDto hotelBusStopToHotelBusStopDto(HotelBusStop hotelBusStop);
}