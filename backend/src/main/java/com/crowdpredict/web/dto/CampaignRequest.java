package com.crowdpredict.web.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Campaign payload for create and edit. All fields are nullable so PUT can behave like the
 * reference implementation: anything omitted keeps its stored value.
 */
public record CampaignRequest(
        String title,
        String description,
        BigDecimal goalAmount,
        Integer durationDays,
        String country,
        Long categoryId,
        String status,
        List<RewardInput> rewards) {
}
