package com.spring.boot.mapper;

import com.spring.boot.dto.BusSeatDto;
import com.spring.boot.dto.BusSeatRequestDto;
import com.spring.boot.model.BusSeat;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

/**
 * MapStruct mapper for BusSeat entity and DTOs.
 */
@Mapper
public interface BusSeatMapper {

    BusSeatMapper INSTANCE = Mappers.getMapper(BusSeatMapper.class);

    BusSeat busSeatRequestDtoToBusSeat(BusSeatRequestDto busSeatRequestDto);

    BusSeatDto busSeatToBusSeatDto(BusSeat busSeat);
}