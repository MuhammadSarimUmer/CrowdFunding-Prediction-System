package com.crowdpredict.web.dto;

/**
 * Admin dashboard aggregates. Field names match {@code AdminStats} in the frontend type
 * definitions exactly (including {@code activeVersion}/{@code activeAlgorithm}).
 */
public record AdminStatsResponse(
        Users users,
        Campaigns campaigns,
        Predictions predictions,
        Models models,
        Datasets datasets) {

    public record Users(long total, long backers, long creators, long admins, long active) {
    }

    public record Campaigns(long total, long evaluated, long active, long drafts) {
    }

    public record Predictions(long total, double averageProbability, long successCount) {
    }

    public record Models(long total, String activeVersion, String activeAlgorithm, double accuracy, double f1Score) {
    }

    public record Datasets(long total, long rows) {
    }

    public static AdminStatsResponse of(long totalUsers, long backers, long creators, long admins, long activeUsers,
                                        long totalCampaigns, long evaluatedCampaigns, long activeCampaigns,
                                        long draftCampaigns, long totalPredictions, double averageProbability,
                                        long successCount, long totalModels, String activeVersion,
                                        String activeAlgorithm, double accuracy, double f1Score,
                                        long totalDatasets, long totalRows) {
        return new AdminStatsResponse(
                new Users(totalUsers, backers, creators, admins, activeUsers),
                new Campaigns(totalCampaigns, evaluatedCampaigns, activeCampaigns, draftCampaigns),
                new Predictions(totalPredictions, averageProbability, successCount),
                new Models(totalModels, activeVersion, activeAlgorithm, accuracy, f1Score),
                new Datasets(totalDatasets, totalRows));
    }
}
