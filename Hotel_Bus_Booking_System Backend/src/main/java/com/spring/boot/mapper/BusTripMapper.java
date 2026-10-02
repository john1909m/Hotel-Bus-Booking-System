package com.spring.boot.mapper;

import com.spring.boot.dto.BusTripDto;
import com.spring.boot.dto.BusTripRequestDto;
import com.spring.boot.model.BusTrip;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

/**
 * MapStruct mapper for BusTrip entity and DTOs.
 */
@Mapper(componentModel = "spring")
public interface BusTripMapper {

    BusTripMapper INSTANCE = Mappers.getMapper(BusTripMapper.class);

    BusTrip busTripRequestDtoToBusTrip(BusTripRequestDto busTripRequestDto);

    BusTripDto busTripToBusTripDto(BusTrip busTrip);
}