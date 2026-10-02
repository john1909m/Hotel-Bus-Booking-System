package com.spring.boot.mapper;

import com.spring.boot.dto.RoomDto;
import com.spring.boot.dto.RoomRequestDto;
import com.spring.boot.model.Room;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

/**
 * MapStruct mapper for Room entity and DTOs.
 */
@Mapper(componentModel = "spring")
public interface RoomMapper {

    RoomMapper INSTANCE = Mappers.getMapper(RoomMapper.class);

    Room roomRequestDtoToRoom(RoomRequestDto roomRequestDto);

    RoomDto roomToRoomDto(Room room);
}