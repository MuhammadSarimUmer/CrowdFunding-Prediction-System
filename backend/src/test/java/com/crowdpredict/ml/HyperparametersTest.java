package com.crowdpredict.ml;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;

import org.junit.jupiter.api.Test;

class HyperparametersTest {

    @Test
    void supportedAlgorithmsMatchTheFrontend() {
        assertEquals(3, Hyperparameters.ALGORITHMS.size());
        assertTrue(Hyperparameters.isSupported("LogisticRegression"));
        assertTrue(Hyperparameters.isSupported("RandomForest"));
        assertTrue(Hyperparameters.isSupported("XGBoost"));
        assertFalse(Hyperparameters.isSupported("NeuralNet"));
        assertFalse(Hyperparameters.isSupported(null));
    }

    @Test
    void valuesOutsideTheRangeProduceFieldKeysTheFormUnderstands() {
        Map<String, String> errors = Hyperparameters.validate("RandomForest",
                Map.of("n_estimators", 5000, "max_depth", 99));

        assertEquals(2, errors.size());
        assertTrue(errors.containsKey("hyperparameters.n_estimators"));
        assertTrue(errors.containsKey("hyperparameters.max_depth"));
        assertTrue(errors.get("hyperparameters.n_estimators").contains("10"));
        assertTrue(errors.get("hyperparameters.n_estimators").contains("1000"));
    }

    @Test
    void missingValuesAreRejectedForAdminRequests() {
        Map<String, String> errors = Hyperparameters.validate("LogisticRegression", Map.of());
        assertTrue(errors.containsKey("hyperparameters.C"));
        assertTrue(errors.containsKey("hyperparameters.max_iter"));
    }

    @Test
    void resolveAppliesScreenDefaults() {
        Map<String, Double> resolved = Hyperparameters.resolve("XGBoost", Map.of());

        assertEquals(0.1, resolved.get("learning_rate"), 1e-9);
        assertEquals(300, resolved.get("n_estimators"), 1e-9);
    }

    @Test
    void resolveKeepsExplicitValuesAndParsesStrings() {
        Map<String, Double> resolved = Hyperparameters.resolve("RandomForest",
                Map.of("n_estimators", "42", "max_depth", 8));

        assertEquals(42, resolved.get("n_estimators"), 1e-9);
        assertEquals(8, resolved.get("max_depth"), 1e-9);
    }

    @Test
    void describeRendersWholeNumbersWithoutDecimals() {
        Map<String, Object> described = Hyperparameters.describe("RandomForest",
                Map.of("n_estimators", 120, "max_depth", 7.0));

        assertEquals(120, described.get("n_estimators"));
        assertEquals(7, described.get("max_depth"));
        assertTrue(described.get("n_estimators") instanceof Integer);
    }
}
