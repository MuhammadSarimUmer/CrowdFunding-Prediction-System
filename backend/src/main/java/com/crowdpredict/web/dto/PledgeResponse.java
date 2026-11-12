package com.crowdpredict.web.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.crowdpredict.domain.Pledge;

/**
 * Pledge as the UI expects it. The date field is called {@code date} (not {@code createdAt})
 * to match {@code Pledge} in the frontend types.
 */
public record PledgeResponse(
        Long pledgeId,
        BigDecimal amount,
        Instant date,
        Long campaignId,
        Long rewardId,
        Long userId,
        CampaignResponse campaign,
        RewardResponse reward) {

    public static PledgeResponse of(Pledge pledge) {
        return new PledgeResponse(
                pledge.getPledgeId(),
                pledge.getAmount(),
                pledge.getCreatedAt(),
                pledge.getCampaign() == null ? null : pledge.getCampaign().getCampaignId(),
                pledge.getReward() == null ? null : pledge.getReward().getRewardId(),
                pledge.getUser() == null ? null : pledge.getUser().getUserId(),
                pledge.getCampaign() == null ? null : CampaignResponse.of(pledge.getCampaign()),
                pledge.getReward() == null ? null : RewardResponse.of(pledge.getReward()));
    }
}
