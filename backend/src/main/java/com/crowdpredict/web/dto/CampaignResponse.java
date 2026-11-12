package com.crowdpredict.web.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.crowdpredict.domain.Campaign;

/**
 * Campaign as the UI consumes it: stored columns plus the derived values the screens read
 * ({@code goalPerDay}, {@code categoryName}, {@code creatorName}, flattened rewards).
 * {@code prediction} carries the newest forecast when the caller supplied one.
 */
public record CampaignResponse(
        Long campaignId,
        String title,
        String description,
        BigDecimal goalAmount,
        Integer durationDays,
        String country,
        Long categoryId,
        Campaign.Status status,
        BigDecimal goalPerDay,
        List<RewardResponse> rewards,
        CategoryResponse category,
        String categoryName,
        UserResponse creator,
        Long creatorId,
        String creatorName,
        BigDecimal pledgedAmount,
        int backerCount,
        Instant createdAt,
        Instant updatedAt,
        Instant endsAt,
        PredictionResponse prediction) {

    public static CampaignResponse of(Campaign campaign) {
        return of(campaign, null);
    }

    public static CampaignResponse of(Campaign campaign, PredictionResponse prediction) {
        return new CampaignResponse(
                campaign.getCampaignId(),
                campaign.getTitle(),
                campaign.getDescription(),
                campaign.getGoalAmount(),
                campaign.getDurationDays(),
                campaign.getCountry(),
                campaign.getCategory() == null ? null : campaign.getCategory().getCategoryId(),
                campaign.getStatus(),
                campaign.goalPerDay(),
                campaign.getRewards().stream().map(RewardResponse::of).toList(),
                campaign.getCategory() == null ? null : CategoryResponse.of(campaign.getCategory()),
                campaign.getCategory() == null ? null : campaign.getCategory().getName(),
                campaign.getCreator() == null ? null : UserResponse.of(campaign.getCreator()),
                campaign.getCreator() == null ? null : campaign.getCreator().getUserId(),
                campaign.getCreator() == null ? null : campaign.getCreator().getName(),
                campaign.getPledgedAmount(),
                campaign.getBackerCount(),
                campaign.getCreatedAt(),
                campaign.getUpdatedAt(),
                campaign.getEndsAt(),
                prediction);
    }
}
