package com.crowdpredict.web.error;

import java.util.Map;

/**
 * Application-level failure with the HTTP status the API contract expects.
 * The message is shown verbatim by the frontend, so keep it user-facing.
 * {@code errors} carries per-field messages for forms ({@code { field: message }}).
 */
public class ApiException extends RuntimeException {

    private final int status;
    private final Map<String, String> errors;

    public ApiException(int status, String message) {
        this(status, message, Map.of());
    }

    public ApiException(int status, String message, Map<String, String> errors) {
        super(message);
        this.status = status;
        this.errors = errors == null ? Map.of() : Map.copyOf(errors);
    }

    public static ApiException badRequest(String message) {
        return new ApiException(400, message);
    }

    public static ApiException unauthorized(String message) {
        return new ApiException(401, message);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(403, message);
    }

    public static ApiException notFound(String message) {
        return new ApiException(404, message);
    }

    public static ApiException conflict(String message) {
        return new ApiException(409, message);
    }

    /** 400 with the standard form banner used by the UI. */
    public static ApiException invalidFields(Map<String, String> errors) {
        return new ApiException(400, "Please check the highlighted fields.", errors);
    }

    public int getStatus() {
        return status;
    }

    public Map<String, String> getErrors() {
        return errors;
    }
}
