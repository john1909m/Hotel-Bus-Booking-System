package com.spring.boot.mapper;

import com.spring.boot.dto.BusDto;
import com.spring.boot.dto.BusRequestDto;
import com.spring.boot.model.Bus;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

/**
 * MapStruct mapper for Bus entity and DTOs.
 */
@Mapper(componentModel = "spring")
public interface BusMapper {

    BusMapper INSTANCE = Mappers.getMapper(BusMapper.class);

    Bus busRequestDtoToBus(BusRequestDto busRequestDto);

    BusDto busToBusDto(Bus bus);
}