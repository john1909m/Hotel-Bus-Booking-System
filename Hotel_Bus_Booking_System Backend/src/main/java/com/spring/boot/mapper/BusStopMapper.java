package com.spring.boot.mapper;

import com.spring.boot.dto.BusStopDto;
import com.spring.boot.dto.BusStopRequestDto;
import com.spring.boot.model.BusStop;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

/**
 * MapStruct mapper for BusStop entity and DTOs.
 */
@Mapper(componentModel = "spring")
public interface BusStopMapper {

    BusStopMapper INSTANCE = Mappers.getMapper(BusStopMapper.class);

    BusStop busStopRequestDtoToBusStop(BusStopRequestDto busStopRequestDto);

    BusStopDto busStopToBusStopDto(BusStop busStop);
}