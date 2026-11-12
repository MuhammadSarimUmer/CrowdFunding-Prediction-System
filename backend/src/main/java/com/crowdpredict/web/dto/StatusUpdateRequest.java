package com.crowdpredict.web.dto;

/** Body of {@code PATCH /api/admin/users/{id}/status}. */
public record StatusUpdateRequest(Boolean isActive) {
}
