package com.crowdpredict.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.crowdpredict.domain.Role;
import com.crowdpredict.web.error.ApiException;

/** Convenience accessors for the authenticated caller. */
public final class CurrentUser {

    private CurrentUser() {
    }

    /** The caller, or {@code null} on a public endpoint. */
    public static AuthPrincipal orNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return authentication.getPrincipal() instanceof AuthPrincipal principal ? principal : null;
    }

    /** The caller; throws 401 when the route is somehow reached anonymously. */
    public static AuthPrincipal require() {
        AuthPrincipal principal = orNull();
        if (principal == null) {
            throw ApiException.unauthorized("Please sign in to continue.");
        }
        return principal;
    }

    public static boolean isAdmin() {
        AuthPrincipal principal = orNull();
        return principal != null && principal.role() == Role.ADMIN;
    }
}
