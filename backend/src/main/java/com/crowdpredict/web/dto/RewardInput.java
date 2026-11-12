package com.crowdpredict.web.dto;

import java.math.BigDecimal;

/**
 * Reward tier as submitted by the editor. {@code rewardId} is echoed back by the frontend
 * on edit; the service replaces tiers wholesale, so it is accepted but not required.
 */
public record RewardInput(
        Long rewardId,
        String title,
        String description,
        BigDecimal minPledge,
        Integer quantity) {
}
