package com.spring.boot.mapper;

import com.spring.boot.dto.BusRouteDto;
import com.spring.boot.dto.BusRouteRequestDto;
import com.spring.boot.model.BusRoute;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

/**
 * MapStruct mapper for BusRoute entity and DTOs.
 */
@Mapper(componentModel = "spring")
public interface BusRouteMapper {

    BusRouteMapper INSTANCE = Mappers.getMapper(BusRouteMapper.class);

    BusRoute busRouteRequestDtoToBusRoute(BusRouteRequestDto busRouteRequestDto);

    BusRouteDto busRouteToBusRouteDto(BusRoute busRoute);
}