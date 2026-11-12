package com.crowdpredict.ml;

/**
 * Parsed training data: one row per campaign, features in {@link FeatureSpec#FEATURES} order,
 * labels 0 (failed) or 1 (funded).
 */
public record CsvTrainingData(double[][] features, int[] labels, int rowCount, int featureCount) {
}
