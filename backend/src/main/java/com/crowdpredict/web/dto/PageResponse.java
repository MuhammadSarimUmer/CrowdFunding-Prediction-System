package com.crowdpredict.web.dto;

import java.util.List;

/** The paginated envelope the frontend expects: {@code { items, total, page, pageSize, totalPages }}. */
public record PageResponse<T>(List<T> items, long total, int page, int pageSize, int totalPages) {

    public static <T> PageResponse<T> of(List<T> all, int page, int pageSize) {
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, pageSize);
        int total = all.size();
        int totalPages = Math.max(1, (int) Math.ceil(total / (double) safeSize));
        int from = Math.min(total, (safePage - 1) * safeSize);
        int to = Math.min(total, from + safeSize);
        return new PageResponse<>(all.subList(from, to), total, safePage, safeSize, totalPages);
    }
}
