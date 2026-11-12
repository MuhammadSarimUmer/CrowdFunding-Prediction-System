package com.crowdpredict.ml;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Deterministic fallback used when no artifact can be loaded (first boot before a model
 * exists, a deleted storage folder, or a failed deserialisation). It mirrors the
 * explainable formula from the frontend mock so demos never break.
 */
public final class HeuristicPredictor {

    private HeuristicPredictor() {
    }

    /** Rebuilds the feature vector expected by {@link Explainer} from raw features. */
    public static double[] rawFeatures(double[] raw) {
        return raw.clone();
    }

    public static double probability(double[] raw) {
        double goalAmount = raw.length > 0 ? raw[0] : 0;
        double durationDays = raw.length > 1 ? raw[1] : 1;
        double goalPerDay = durationDays <= 0 ? 0 : goalAmount / durationDays;
        double rewardCount = raw.length > 3 ? raw[3] : 0;
        double descriptionLength = raw.length > 4 ? raw[4] : 0;
        double backerCount = raw.length > 6 ? raw[6] : 0;

        Map<String, Double> factors = factors(goalAmount, durationDays, goalPerDay,
                rewardCount, descriptionLength, backerCount);
        double positive = factors.values().stream()
                .filter(value -> value > 0)
                .mapToDouble(Double::doubleValue)
                .sum();
        double probability = clamp(0.42 + positive * 0.62, 0.05, 0.97);
        return Math.round(probability * 100.0) / 100.0;
    }

    public static Map<String, Double> factors(double[] raw) {
        double goalAmount = raw.length > 0 ? raw[0] : 0;
        double durationDays = raw.length > 1 ? raw[1] : 1;
        double goalPerDay = durationDays <= 0 ? 0 : goalAmount / durationDays;
        double rewardCount = raw.length > 3 ? raw[3] : 0;
        double descriptionLength = raw.length > 4 ? raw[4] : 0;
        double backerCount = raw.length > 6 ? raw[6] : 0;
        return factors(goalAmount, durationDays, goalPerDay, rewardCount, descriptionLength, backerCount);
    }

    private static Map<String, Double> factors(double goalAmount, double durationDays, double goalPerDay,
                                               double rewardCount, double descriptionLength, double backerCount) {
        Map<String, Double> factors = new LinkedHashMap<>();
        factors.put("goalAmount", round(clamp(0.34 - goalAmount / 150000, -0.18, 0.3)));
        factors.put("durationDays", round(durationDays >= 21 && durationDays <= 45 ? 0.2 : -0.1));
        factors.put("goalPerDay", round(goalPerDay <= 500 ? 0.18 : goalPerDay <= 900 ? 0.06 : -0.14));
        factors.put("rewardCount", round(Math.min(0.12, 0.04 + rewardCount * 0.025)));
        factors.put("descriptionLength", round(descriptionLength >= 280 ? 0.06 : -0.03));
        factors.put("backerVelocity", round(backerCount >= 100 ? 0.08 : -0.02));
        return factors;
    }

    private static double clamp(double value, double min, double max) {
        return Math.min(max, Math.max(min, value));
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
