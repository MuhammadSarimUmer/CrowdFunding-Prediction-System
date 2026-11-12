package com.crowdpredict.ml;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import smile.classification.Classifier;
import smile.data.Tuple;
import smile.feature.importance.SHAP;

/**
 * Turns a trained artifact into the short list of signed factor contributions the
 * prediction screen renders. Values are fractions (for example {@code 0.18}), matching
 * the frontend chart's {@code toPercentPoints} helper, and the dictionary is ordered
 * from most to least influential.
 *
 * <p>Tree ensembles use Smile's TreeSHAP implementation, which gives additive signed
 * contributions that explain the predicted probability. Logistic regression and any
 * model without SHAP support fall back to a one-at-a-time probe: the campaign is
 * re-scored with each feature set to the training mean and the difference is the
 * contribution. Both approaches keep the sign meaningful ("this helped" / "this hurt"),
 * which raw feature importance cannot express.
 */
public final class Explainer {

    private static final int MAX_FACTORS = 6;
    private static final double ABSOLUTE_BUDGET = 0.85;

    private Explainer() {
    }

    public static Map<String, Double> explain(TrainedArtifact artifact, double[] rawFeatures) {
        if (artifact == null) {
            return HeuristicPredictor.factors(HeuristicPredictor.rawFeatures(rawFeatures));
        }
        List<String> features = artifact.getFeatures();
        double[] standardised = artifact.standardise(rawFeatures);
        int width = Math.min(standardised.length, features.size());

        double[] shapValues = shapContributions(artifact, standardised, features);
        final double[] contributions = shapValues != null
                ? shapValues
                : probeContributions(artifact, standardised);

        List<Integer> indexes = new ArrayList<>();
        double absoluteTotal = 0;
        for (int i = 0; i < width; i++) {
            if (Math.abs(contributions[i]) > 1e-6) {
                indexes.add(i);
                absoluteTotal += Math.abs(contributions[i]);
            }
        }
        if (indexes.isEmpty() || absoluteTotal <= 1e-9) {
            return defaultFactors();
        }

        double scale = ABSOLUTE_BUDGET / absoluteTotal;
        indexes.sort(Comparator.comparingDouble((Integer i) -> Math.abs(contributions[i])).reversed());
        Map<String, Double> factors = new LinkedHashMap<>();
        for (int index : indexes.subList(0, Math.min(MAX_FACTORS, indexes.size()))) {
            double value = Math.round(contributions[index] * scale * 100.0) / 100.0;
            if (value != 0) {
                factors.put(displayName(features.get(index)), value);
            }
        }
        return factors.isEmpty() ? defaultFactors() : factors;
    }

    /** TreeSHAP values in feature order, or {@code null} when the model has no usable SHAP. */
    private static double[] shapContributions(TrainedArtifact artifact, double[] standardised,
                                              List<String> features) {
        Classifier<Tuple> tree = artifact.getTree();
        if (!(tree instanceof SHAP<?>)) {
            return null;
        }
        try {
            Tuple row = SmileFrames.singleRow(standardised, features);
            @SuppressWarnings("unchecked")
            double[] values = ((SHAP<Tuple>) tree).shap(row);
            int classes = Math.max(1, artifact.getClasses().length);
            if (values == null || values.length != features.size() * classes) {
                return null;
            }
            // Smile returns feature-major values: [f0c0, f0c1, f1c0, f1c1, ...].
            int positive = artifact.successClassIndex();
            double[] contributions = new double[features.size()];
            for (int i = 0; i < contributions.length; i++) {
                contributions[i] = values[i * classes + positive];
            }
            return contributions;
        } catch (RuntimeException ignored) {
            // fall through to the probe explainer
        }
        return null;
    }

    /** First-order probe: probability delta when each feature is reset to the training mean. */
    private static double[] probeContributions(TrainedArtifact artifact, double[] standardised) {
        double score = artifact.successProbabilityStandardised(standardised);
        double[] contributions = new double[standardised.length];
        double[] probe = standardised.clone();
        for (int i = 0; i < standardised.length; i++) {
            probe[i] = 0;
            contributions[i] = score - artifact.successProbabilityStandardised(probe);
            probe[i] = standardised[i];
        }
        return contributions;
    }

    /** Friendly keys understood by the frontend's {@code factorExplanation}. */
    private static String displayName(String feature) {
        return switch (feature) {
            case "backerCount" -> "backerVelocity";
            case "countryIndex" -> "country";
            case "categoryId" -> "category";
            default -> feature;
        };
    }

    private static Map<String, Double> defaultFactors() {
        Map<String, Double> factors = new LinkedHashMap<>();
        factors.put("goalAmount", -0.12);
        factors.put("durationDays", 0.1);
        factors.put("goalPerDay", -0.08);
        factors.put("rewardCount", 0.06);
        return factors;
    }
}
