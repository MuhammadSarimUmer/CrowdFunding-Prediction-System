package com.crowdpredict.web.dto;

/** Body of {@code POST /api/predictions}. */
public record PredictionRequest(Long campaignId) {
}
