package com.spring.boot.helper;

import com.spring.boot.dto.UserDto;
import com.spring.boot.enums.Role;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Objects;

/**
 * Utility methods for accessing the currently authenticated user and checking authorization.
 */
public final class SecurityUtils {

    private SecurityUtils() {}

    public static UserDto getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDto userDto) {
            return userDto;
        }
        return null;
    }

    public static Long getCurrentUserId() {
        UserDto user = getCurrentUser();
        return user != null ? user.getId() : null;
    }

    public static boolean isCurrentUserAdmin() {
        UserDto user = getCurrentUser();
        return user != null && user.getRole() == Role.ADMIN;
    }

    public static boolean isOwnerOrAdmin(Long ownerUserId) {
        if (isCurrentUserAdmin()) {
            return true;
        }
        Long currentUserId = getCurrentUserId();
        return currentUserId != null && Objects.equals(currentUserId, ownerUserId);
    }
}
