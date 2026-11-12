package com.crowdpredict.domain;

import java.util.Locale;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Account roles. Codes are lowercase because they are stored verbatim in
 * {@code users.role} and sent to the frontend as {@code "backer" | "creator" | "admin"}.
 */
public enum Role {
    BACKER("backer"),
    CREATOR("creator"),
    ADMIN("admin");

    private final String code;

    Role(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }

    public String authority() {
        return "ROLE_" + name();
    }

    @JsonCreator
    public static Role fromCode(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        for (Role role : values()) {
            if (role.code.equals(normalized)) {
                return role;
            }
        }
        throw new IllegalArgumentException("Unknown role: " + value);
    }
}
