package com.crowdpredict.ml;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The hyperparameter contract shared with the training screen. Ranges and defaults are
 * copied from {@code frontend/src/lib/constants.ts} so the UI never sends something the
 * backend silently reinterprets.
 */
public final class Hyperparameters {

    public record Spec(String name, double min, double max, double defaultValue, boolean integer) {
    }

    public static final List<String> ALGORITHMS =
            List.of("LogisticRegression", "RandomForest", "XGBoost");

    private static final Map<String, List<Spec>> SPECS = Map.of(
            "LogisticRegression", List.of(
                    new Spec("C", 0.01, 10, 1, false),
                    new Spec("max_iter", 100, 5000, 1000, true)),
            "RandomForest", List.of(
                    new Spec("n_estimators", 10, 1000, 200, true),
                    new Spec("max_depth", 2, 40, 12, true)),
            "XGBoost", List.of(
                    new Spec("learning_rate", 0.01, 0.5, 0.1, false),
                    new Spec("n_estimators", 50, 1000, 300, true)));

    private Hyperparameters() {
    }

    public static List<Spec> specs(String algorithm) {
        return SPECS.getOrDefault(algorithm, List.of());
    }

    public static boolean isSupported(String algorithm) {
        return algorithm != null && SPECS.containsKey(algorithm);
    }

    /** Field errors keyed exactly as the React form expects ({@code hyperparameters.C}). */
    public static Map<String, String> validate(String algorithm, Map<String, Object> input) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (Spec spec : specs(algorithm)) {
            Double value = number(input == null ? null : input.get(spec.name()));
            if (value == null || value < spec.min() || value > spec.max()) {
                errors.put("hyperparameters." + spec.name(),
                        String.format(Locale.ROOT, "%s must be between %s and %s.",
                                spec.name(), trim(spec.min()), trim(spec.max())));
            }
        }
        return errors;
    }

    /** Validated values with the screen defaults applied where a value was omitted. */
    public static Map<String, Double> resolve(String algorithm, Map<String, Object> input) {
        Map<String, Double> resolved = new LinkedHashMap<>();
        for (Spec spec : specs(algorithm)) {
            Double value = number(input == null ? null : input.get(spec.name()));
            resolved.put(spec.name(), value == null ? spec.defaultValue() : value);
        }
        return resolved;
    }

    /** Keeps API payloads readable: whole numbers stay integers, fractions keep precision. */
    public static Map<String, Object> describe(String algorithm, Map<String, Object> input) {
        Map<String, Object> resolved = new LinkedHashMap<>();
        for (Spec spec : specs(algorithm)) {
            Double value = number(input == null ? null : input.get(spec.name()));
            double effective = value == null ? spec.defaultValue() : value;
            resolved.put(spec.name(), spec.integer() ? (Object) (int) Math.round(effective) : (Object) effective);
        }
        return resolved;
    }

    private static Double number(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String trim(double value) {
        return value == Math.rint(value) ? String.valueOf((long) value) : String.valueOf(value);
    }
}
