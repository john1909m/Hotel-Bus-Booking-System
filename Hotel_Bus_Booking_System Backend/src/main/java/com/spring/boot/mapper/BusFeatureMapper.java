package com.spring.boot.mapper;

import com.spring.boot.dto.BusFeatureDto;
import com.spring.boot.dto.BusFeatureRequestDto;
import com.spring.boot.model.BusFeature;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

/**
 * MapStruct mapper for BusFeature entity and DTOs.
 */
@Mapper(componentModel = "spring", builder = @org.mapstruct.Builder(disableBuilder = true))
public interface BusFeatureMapper {

    BusFeatureMapper INSTANCE = Mappers.getMapper(BusFeatureMapper.class);

    BusFeatureDto busFeatureToBusFeatureDto(BusFeature busFeature);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    BusFeature busFeatureRequestDtoToBusFeature(BusFeatureRequestDto busFeatureRequestDto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateBusFeatureFromDto(BusFeatureRequestDto dto, @MappingTarget BusFeature entity);
}
