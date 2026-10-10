package com.spring.boot.mapper;

import com.spring.boot.dto.CostumerDto;
import com.spring.boot.model.Costumer;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

/**
 * MapStruct mapper for Costumer entity and DTO.
 */
@Mapper(componentModel = "spring")
public interface CostumerMapper {

    CostumerMapper INSTANCE = Mappers.getMapper(CostumerMapper.class);

    Costumer costumerDtoToCostumer(CostumerDto costumerDto);

    CostumerDto costumerToCostumerDto(Costumer costumer);
}