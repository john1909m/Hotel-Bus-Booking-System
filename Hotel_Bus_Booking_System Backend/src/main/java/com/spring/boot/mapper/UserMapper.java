package com.spring.boot.mapper;

import com.spring.boot.dto.UserDto;
import com.spring.boot.dto.UserRequestDto;
import com.spring.boot.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

/**
 * MapStruct mapper for User entity and DTOs.
 */
@Mapper(componentModel = "spring")
public interface UserMapper {

    UserMapper INSTANCE = Mappers.getMapper(UserMapper.class);

    User userRequestDtoToUser(UserRequestDto userRequestDto);

    UserDto userToUserDto(User user);

    User toEntity(UserDto userDto);
}