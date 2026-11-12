package com.crowdpredict.service;

import java.math.BigDecimal;

/** Query parameters accepted by {@code GET /api/campaigns}. */
public record CampaignFilter(
        boolean mine,
        Long creatorId,
        String search,
        String category,
        String country,
        BigDecimal minGoal,
        BigDecimal maxGoal,
        int page,
        int pageSize) {
}
