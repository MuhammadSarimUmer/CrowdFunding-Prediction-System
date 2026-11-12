package com.crowdpredict.ml;

import java.util.LinkedHashMap;
import java.util.Map;

/** Illustrative importances used only when a stored artifact is unavailable. */
public final class FeatureDefaults {

    private FeatureDefaults() {
    }

    public static Map<String, Double> importance(String algorithm) {
        Map<String, Double> values = new LinkedHashMap<>();
        switch (algorithm == null ? "" : algorithm) {
            case "XGBoost" -> {
                values.put("goalPerDay", 0.22);
                values.put("goalAmount", 0.19);
                values.put("backerCount", 0.16);
                values.put("durationDays", 0.14);
                values.put("rewardCount", 0.11);
                values.put("descriptionLength", 0.08);
                values.put("categoryId", 0.06);
                values.put("countryIndex", 0.04);
            }
            case "LogisticRegression" -> {
                values.put("goalAmount", 0.27);
                values.put("goalPerDay", 0.21);
                values.put("durationDays", 0.18);
                values.put("rewardCount", 0.12);
                values.put("descriptionLength", 0.09);
                values.put("categoryId", 0.07);
                values.put("countryIndex", 0.06);
            }
            default -> {
                values.put("goalAmount", 0.24);
                values.put("durationDays", 0.18);
                values.put("goalPerDay", 0.16);
                values.put("rewardCount", 0.12);
                values.put("descriptionLength", 0.09);
                values.put("countryIndex", 0.07);
                values.put("categoryId", 0.06);
                values.put("backerCount", 0.05);
                values.put("titleLength", 0.03);
            }
        }
        return values;
    }
}
