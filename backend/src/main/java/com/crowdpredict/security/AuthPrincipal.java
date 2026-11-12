package com.crowdpredict.security;

import java.util.List;

import com.crowdpredict.domain.Role;

/**
 * What we put in the SecurityContext for an authenticated request. It carries just enough
 * to authorise and to render the caller without another query.
 */
public record AuthPrincipal(Long userId, String email, String name, Role role) {

    public List<String> authorities() {
        return List.of(role.authority());
    }
}
