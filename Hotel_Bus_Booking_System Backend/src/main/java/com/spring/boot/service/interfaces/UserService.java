package com.spring.boot.service.interfaces;
import com.spring.boot.dto.UserDto;
import com.spring.boot.dto.UserRequestDto;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;

import java.util.List;


/**
 * Service interface for User entity.
 */
public interface UserService {

    UserDto createUser(UserRequestDto userRequestDto);

    UserDto getUserById(Long id);

    UserDto getUserByEmail(String email);

    List<UserDto> getAllUsers();

    Page<UserDto> getAllUsersPaginated(Pageable pageable,
                                       String q, String role);

    UserDto updateUser(Long id, UserRequestDto userRequestDto);

    void deleteUser(Long id);
}