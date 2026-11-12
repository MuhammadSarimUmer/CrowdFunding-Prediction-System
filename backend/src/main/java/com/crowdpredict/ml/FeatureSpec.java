package com.crowdpredict.ml;

import java.util.List;
import java.util.Locale;

import com.crowdpredict.domain.Campaign;

/**
 * The feature contract shared by training, prediction and explanations.
 * Order matters: every stored artifact maps weights/importances to these positions.
 */
public final class FeatureSpec {

    public static final List<String> FEATURES = List.of(
            "goalAmount",
            "durationDays",
            "goalPerDay",
            "rewardCount",
            "descriptionLength",
            "titleLength",
            "backerCount",
            "categoryId",
            "countryIndex");

    public static final List<String> COUNTRIES = List.of(
            "US", "GB", "CA", "DE", "FR", "PK", "IN", "AU", "SG", "AE");

    private FeatureSpec() {
    }

    /** Features for a stored campaign, in {@link #FEATURES} order. */
    public static double[] fromCampaign(Campaign campaign) {
        double goal = campaign.getGoalAmount() == null ? 0 : campaign.getGoalAmount().doubleValue();
        double days = campaign.getDurationDays() == null ? 1 : campaign.getDurationDays();
        double goalPerDay = days <= 0 ? 0 : goal / days;
        double descriptionLength = campaign.getDescription() == null ? 0 : campaign.getDescription().trim().length();
        double titleLength = campaign.getTitle() == null ? 0 : campaign.getTitle().trim().length();
        double categoryId = campaign.getCategory() == null ? 0 : campaign.getCategory().getCategoryId();
        return new double[] {
                goal,
                days,
                goalPerDay,
                campaign.getRewards() == null ? 0 : campaign.getRewards().size(),
                descriptionLength,
                titleLength,
                campaign.getBackerCount(),
                categoryId,
                countryIndex(campaign.getCountry())
        };
    }

    public static int countryIndex(String code) {
        if (code == null) {
            return COUNTRIES.size();
        }
        int index = COUNTRIES.indexOf(code.trim().toUpperCase(Locale.ROOT));
        return index < 0 ? COUNTRIES.size() : index;
    }

    public static double[] fromValues(double goalAmount, double durationDays, double rewardCount,
                                      double descriptionLength, double titleLength, double backerCount,
                                      double categoryId, String country) {
        double days = durationDays <= 0 ? 1 : durationDays;
        return new double[] {
                goalAmount,
                days,
                goalAmount / days,
                rewardCount,
                descriptionLength,
                titleLength,
                backerCount,
                categoryId,
                countryIndex(country)
        };
    }
}
