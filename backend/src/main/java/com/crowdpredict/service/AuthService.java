package com.crowdpredict.service;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.crowdpredict.domain.Role;
import com.crowdpredict.domain.User;
import com.crowdpredict.repository.UserRepository;
import com.crowdpredict.security.CurrentUser;
import com.crowdpredict.security.JwtService;
import com.crowdpredict.web.dto.AuthResponse;
import com.crowdpredict.web.dto.LoginRequest;
import com.crowdpredict.web.dto.RegisterRequest;
import com.crowdpredict.web.dto.UserResponse;
import com.crowdpredict.web.error.ApiException;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase(java.util.Locale.ROOT);
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> ApiException.unauthorized("Email or password is incorrect."));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Email or password is incorrect.");
        }
        if (!user.isActive()) {
            throw ApiException.forbidden("This account has been deactivated. Contact an administrator.");
        }
        return session(user);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String name = request.name() == null ? "" : request.name().trim();
        String email = request.email() == null ? "" : request.email().trim().toLowerCase(java.util.Locale.ROOT);
        String organization = request.organization() == null ? "" : request.organization().trim();

        Role role = Role.fromCode(request.role());
        if (role == null) {
            throw ApiException.invalidFields(Map.of("role", "Choose an account type."));
        }
        if (role == Role.ADMIN) {
            throw ApiException.invalidFields(Map.of("role", "Admin accounts are created by an administrator."));
        }

        Map<String, String> errors = new LinkedHashMap<>();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            errors.put("email", "An account with this email already exists.");
        }
        if (role == Role.CREATOR && organization.isEmpty()) {
            errors.put("organization", "Organization is required for creator accounts.");
        }
        if (!errors.isEmpty()) {
            throw ApiException.invalidFields(errors);
        }

        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(role);
        user.setOrganization(organization.isEmpty() ? null : organization);
        user.setActive(true);

        try {
            userRepository.save(user);
        } catch (DataIntegrityViolationException ex) {
            // Someone registered the same address between the check and the insert.
            throw ApiException.invalidFields(Map.of("email", "An account with this email already exists."));
        }
        return session(user);
    }

    @Transactional(readOnly = true)
    public UserResponse me() {
        Long userId = CurrentUser.require().userId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("Please sign in to continue."));
        return UserResponse.of(user);
    }

    private AuthResponse session(User user) {
        String token = jwtService.issue(user.getUserId(), user.getEmail(), user.getRole().code());
        return new AuthResponse(token, UserResponse.of(user));
    }
}
