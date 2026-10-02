package com.spring.boot.service.impl;

import com.spring.boot.dto.UserDto;
import com.spring.boot.dto.UserRequestDto;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.User;
import com.spring.boot.mapper.UserMapper;
import com.spring.boot.repository.UserRepository;
import com.spring.boot.service.interfaces.UserService;
import lombok.AllArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;


/**
 * Service implementation for User entity.
 */
@Service
@AllArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final BundleMessageService bundleMessageService;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserDto createUser(UserRequestDto userRequestDto) {
        // Check if email already exists
        if (userRepository.existsByEmail(userRequestDto.getEmail())) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.email_exists"));
        }

        // Encode password
        String encodedPassword = passwordEncoder.encode(userRequestDto.getPassword());

        // Map DTO to entity
        User user = userMapper.userRequestDtoToUser(userRequestDto);
        user.setPassword(encodedPassword);

        // Save user
        User savedUser = userRepository.save(user);

        // Return DTO
        return userMapper.userToUserDto(savedUser);
    }

    @Override
    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.user_not_found")));
        return userMapper.userToUserDto(user);
    }

    @Override
    public UserDto getUserByEmail(String email) {
        User user = userRepository.findByEmail(email);
        return userMapper.userToUserDto(user);
    }

    @Override
    public java.util.List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(userMapper::userToUserDto)
                .toList();
    }

    @Override
    public UserDto updateUser(Long id, UserRequestDto userRequestDto) {
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.user_not_found")));

        // Check if email is being changed and already exists
        if (!existingUser.getEmail().equals(userRequestDto.getEmail()) &&
                userRepository.existsByEmail(userRequestDto.getEmail())) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.email_exists"));
        }

        // Update fields
        existingUser.setName(userRequestDto.getName());
        existingUser.setEmail(userRequestDto.getEmail());
        // Only update password if provided
        if (userRequestDto.getPassword() != null && !userRequestDto.getPassword().isEmpty()) {
            existingUser.setPassword(passwordEncoder.encode(userRequestDto.getPassword()));
        }
        existingUser.setPhoneNumber(userRequestDto.getPhoneNumber());
        existingUser.setRole(userRequestDto.getRole());

        // Save user
        User updatedUser = userRepository.save(existingUser);

        // Return DTO
        return userMapper.userToUserDto(updatedUser);
    }

    @Override
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.user_not_found"));
        }
        userRepository.deleteById(id);
    }
}