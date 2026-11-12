package com.crowdpredict.web.dto;

import java.math.BigDecimal;

import com.crowdpredict.domain.Reward;

public record RewardResponse(
        Long rewardId,
        String title,
        String description,
        BigDecimal minPledge,
        Integer quantity) {

    public static RewardResponse of(Reward reward) {
        return new RewardResponse(
                reward.getRewardId(),
                reward.getTitle(),
                reward.getDescription(),
                reward.getMinPledge(),
                reward.getQuantity());
    }
}
