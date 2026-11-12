package com.crowdpredict.web.dto;

import java.time.Instant;
import java.util.Map;

import com.crowdpredict.domain.Prediction;

/**
 * Forecast as the creator screens consume it: the stored probability/label/factors plus
 * the active model's display name ({@code modelVersion}) and the embedded campaign.
 * The nested campaign intentionally has no prediction of its own to avoid recursion.
 */
public record PredictionResponse(
        Long predictionId,
        double probability,
        String label,
        Map<String, Double> topFactors,
        Instant createdAt,
        String modelVersion,
        Long campaignId,
        CampaignResponse campaign,
        String modelAlgorithm,
        Long modelVersionId,
        String explanation) {

    public static PredictionResponse of(Prediction prediction) {
        CampaignResponse campaign = prediction.getCampaign() == null
                ? null
                : CampaignResponse.of(prediction.getCampaign());
        return new PredictionResponse(
                prediction.getPredictionId(),
                prediction.getProbability(),
                prediction.getLabel(),
                JsonPayload.readFractions(prediction.getTopFactors()),
                prediction.getCreatedAt(),
                prediction.getModelVersion() == null ? "Heuristic v1" : prediction.getModelVersion().getName(),
                prediction.getCampaign() == null ? null : prediction.getCampaign().getCampaignId(),
                campaign,
                prediction.getModelVersion() == null ? "Heuristic" : prediction.getModelVersion().getAlgorithm(),
                prediction.getModelVersion() == null ? null : prediction.getModelVersion().getVersionId(),
                prediction.getExplanation());
    }
}
