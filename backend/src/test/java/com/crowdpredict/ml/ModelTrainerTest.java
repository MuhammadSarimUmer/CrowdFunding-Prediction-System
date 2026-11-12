package com.crowdpredict.ml;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import java.util.Random;

import org.junit.jupiter.api.Test;

class ModelTrainerTest {

    @Test
    void trainsAllThreeAlgorithmsDeterministically() {
        CsvTrainingData data = syntheticData(240);

        for (String algorithm : Hyperparameters.ALGORITHMS) {
            ModelTrainer.TrainingResult first = ModelTrainer.train(
                    algorithm, Hyperparameters.resolve(algorithm, Map.of()), data);
            ModelTrainer.TrainingResult second = ModelTrainer.train(
                    algorithm, Hyperparameters.resolve(algorithm, Map.of()), data);

            TrainingMetrics metrics = first.metrics();
            assertTrue(metrics.accuracy() >= 0 && metrics.accuracy() <= 1, algorithm);
            assertTrue(metrics.rocAuc() >= 0 && metrics.rocAuc() <= 1, algorithm);
            if (!"XGBoost".equals(algorithm)) {
                // Smile's gradient boosting uses internal randomness; the other two are stable.
                assertEquals(metrics.accuracy(), second.metrics().accuracy(), 1e-9, algorithm);
            }
            assertEquals(9, first.artifact().getFeatures().size(), algorithm);
            assertNotNull(first.artifact().getClasses());
            assertTrue(first.artifact().getClasses().length >= 1);
            assertTrue(metrics.featureImportance().size() == 9, algorithm);
        }
    }

    @Test
    void probabilityAndExplanationFactorsAreUsable() {
        CsvTrainingData data = syntheticData(160);
        ModelTrainer.TrainingResult result = ModelTrainer.train(
                "LogisticRegression", Hyperparameters.resolve("LogisticRegression", Map.of()), data);

        double[] features = FeatureSpec.fromValues(15000, 30, 3, 300, 40, 30, 2, "US");
        double probability = result.artifact().successProbabilityStandardised(
                result.artifact().standardise(features));

        assertTrue(probability >= 0 && probability <= 1);
        Map<String, Double> factors = Explainer.explain(result.artifact(), features);
        assertTrue(factors.size() <= 6);
        assertTrue(factors.values().stream().allMatch(value -> value >= -1 && value <= 1));
    }

    /** Goal, duration and backer count carry signal; the rest is noise. */
    private static CsvTrainingData syntheticData(int rows) {
        Random random = new Random(7);
        double[][] features = new double[rows][];
        int[] labels = new int[rows];
        for (int i = 0; i < rows; i++) {
            double goal = 1000 + random.nextInt(40000);
            double days = 10 + random.nextInt(51);
            double backers = random.nextInt(500);
            double score = (backers / 500.0) - (goal / 80000.0) + (random.nextDouble() - 0.5) * 0.3;
            labels[i] = score > 0.1 ? 1 : 0;
            features[i] = FeatureSpec.fromValues(goal, days, 1 + random.nextInt(5),
                    80 + random.nextInt(400), 20 + random.nextInt(50), backers,
                    1 + random.nextInt(7), FeatureSpec.COUNTRIES.get(random.nextInt(10)));
        }
        return new CsvTrainingData(features, labels, rows, FeatureSpec.FEATURES.size());
    }
}
