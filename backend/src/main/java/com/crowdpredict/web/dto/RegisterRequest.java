package com.crowdpredict.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Enter your full name.")
        @Size(min = 2, message = "Enter your full name.")
        String name,

        @NotBlank(message = "Enter a valid email address.")
        @Email(message = "Enter a valid email address.")
        String email,

        @NotBlank(message = "Use at least 6 characters.")
        @Size(min = 6, message = "Use at least 6 characters.")
        String password,

        @NotBlank(message = "Choose an account type.")
        String role,

        String organization) {
}
