package com.crowdpredict.web.dto;

public record AuthResponse(String token, UserResponse user) {
}
