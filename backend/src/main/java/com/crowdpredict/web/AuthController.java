package com.crowdpredict.web;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.crowdpredict.service.AuthService;
import com.crowdpredict.web.dto.AuthResponse;
import com.crowdpredict.web.dto.LoginRequest;
import com.crowdpredict.web.dto.RegisterRequest;
import com.crowdpredict.web.dto.UserResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @GetMapping("/me")
    public UserResponse me() {
        return authService.me();
    }

    /**
     * Tokens are stateless, so logout only has to make the client discard its copy.
     * Kept permissive so an expired token can still "sign out" cleanly.
     */
    @PostMapping("/logout")
    public Map<String, Object> logout() {
        return Map.of("success", true);
    }
}
