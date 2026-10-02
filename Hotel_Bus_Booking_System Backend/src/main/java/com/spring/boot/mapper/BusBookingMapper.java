package com.spring.boot.mapper;

import com.spring.boot.dto.BusBookingDto;
import com.spring.boot.dto.BusBookingRequestDto;
import com.spring.boot.model.BusBooking;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

/**
 * MapStruct mapper for BusBooking entity and DTOs.
 */
@Mapper
public interface BusBookingMapper {

    BusBookingMapper INSTANCE = Mappers.getMapper(BusBookingMapper.class);

    BusBooking busBookingRequestDtoToBusBooking(BusBookingRequestDto busBookingRequestDto);

    BusBookingDto busBookingToBusBookingDto(BusBooking busBooking);
}