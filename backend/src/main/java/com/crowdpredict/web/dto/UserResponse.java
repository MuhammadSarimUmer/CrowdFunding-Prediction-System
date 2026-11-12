package com.crowdpredict.web.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.crowdpredict.domain.Role;

/**
 * Public shape of a user — mirrors {@code User} in the frontend types.
 * {@code totalPledged} and {@code adminLevel} are populated where the contract asks for them
 * (admin user list / detail); they stay null elsewhere and are omitted from JSON.
 */
public record UserResponse(
        Long userId,
        String name,
        String email,
        Role role,
        String organization,
        Boolean isActive,
        Instant createdAt,
        BigDecimal totalPledged,
        Integer adminLevel) {

    public static UserResponse of(com.crowdpredict.domain.User user) {
        return new UserResponse(
                user.getUserId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getOrganization(),
                user.isActive(),
                user.getCreatedAt(),
                null,
                user.getAdminLevel());
    }

    public static UserResponse withTotalPledged(com.crowdpredict.domain.User user, BigDecimal totalPledged) {
        return new UserResponse(
                user.getUserId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getOrganization(),
                user.isActive(),
                user.getCreatedAt(),
                totalPledged,
                user.getAdminLevel());
    }
}
