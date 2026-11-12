package com.crowdpredict.security;

import java.io.IOException;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.crowdpredict.repository.UserRepository;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Reads {@code Authorization: Bearer <jwt>} and authenticates the request.
 *
 * <p>The user is re-read on every request on purpose: an admin deactivating an account,
 * or changing a role, must take effect immediately instead of when the 24 h token expires.
 * A missing/invalid token is not an error here — the filter stays silent and lets the
 * security chain decide whether the route is public.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith(PREFIX)) {
            chain.doFilter(request, response);
            return;
        }

        Claims claims = jwtService.parse(header.substring(PREFIX.length()).trim());
        if (claims != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            Long userId = asLong(claims.getSubject());
            if (userId != null) {
                userRepository.findById(userId)
                        .filter(user -> user.isActive())
                        .ifPresent(user -> {
                            AuthPrincipal principal = new AuthPrincipal(
                                    user.getUserId(), user.getEmail(), user.getName(), user.getRole());
                            UsernamePasswordAuthenticationToken authentication =
                                    new UsernamePasswordAuthenticationToken(
                                            principal, null,
                                            principal.authorities().stream()
                                                    .map(org.springframework.security.core.authority.SimpleGrantedAuthority::new)
                                                    .toList());
                            SecurityContextHolder.getContext().setAuthentication(authentication);
                        });
            }
        }

        chain.doFilter(request, response);
    }

    private Long asLong(String value) {
        try {
            return value == null ? null : Long.valueOf(value);
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
