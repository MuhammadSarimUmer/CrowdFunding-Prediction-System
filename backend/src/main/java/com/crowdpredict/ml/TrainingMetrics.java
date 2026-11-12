package com.crowdpredict.ml;

import java.util.List;

/**
 * Metrics produced by one training run. The confusion matrix is computed on the
 * held-out split; feature importances are normalised to sum to 1.
 */
public record TrainingMetrics(
        double accuracy,
        double precision,
        double recall,
        double f1Score,
        double rocAuc,
        int truePositive,
        int falsePositive,
        int falseNegative,
        int trueNegative,
        List<FeatureImportance> featureImportance) {

    public record FeatureImportance(String feature, double importance) {
    }
}
