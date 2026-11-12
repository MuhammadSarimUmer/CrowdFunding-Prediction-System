package com.crowdpredict.web.dto;

import java.time.Instant;
import java.util.List;

/**
 * Metrics shown in the model-details dialog. The confusion matrix is scaled to 10,000
 * rows (the same convention as the reference mock) and feature importances are the
 * normalised values stored in the artifact.
 */
public record ModelMetricsResponse(
        double accuracy,
        double f1Score,
        double precision,
        double recall,
        double rocAuc,
        Instant evaluatedAt,
        ConfusionMatrix confusionMatrix,
        List<FeatureImportance> featureImportance) {

    public record ConfusionMatrix(int truePositive, int falsePositive, int falseNegative, int trueNegative) {
    }

    public record FeatureImportance(String feature, double importance) {
    }
}
