package com.crowdpredict.ml;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Random;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import smile.classification.Classifier;
import smile.classification.GradientTreeBoost;
import smile.classification.LogisticRegression;
import smile.classification.RandomForest;
import smile.data.DataFrame;
import smile.data.Tuple;
import smile.data.formula.Formula;

/**
 * Trains one Smile classifier on an 80/20 split and returns the serialisable artifact
 * plus the metrics shown on the admin screens. The split is deterministic
 * ({@link Random} seed 42) so a retrain of the same dataset gives the same numbers.
 */
public final class ModelTrainer {

    private static final Logger log = LoggerFactory.getLogger(ModelTrainer.class);
    private static final long SEED = 42L;
    private static final double TRAIN_RATIO = 0.8;

    public record TrainingResult(TrainedArtifact artifact, TrainingMetrics metrics) {
    }

    private ModelTrainer() {
    }

    public static TrainingResult train(String algorithm, Map<String, Double> hyperparameters,
                                       CsvTrainingData data) {
        List<String> features = FeatureSpec.FEATURES;
        int rows = data.rowCount();
        int columns = features.size();

        int[] order = new int[rows];
        for (int i = 0; i < rows; i++) {
            order[i] = i;
        }
        shuffle(order, new Random(SEED));
        int trainSize = Math.max(2, (int) Math.round(rows * TRAIN_RATIO));
        trainSize = Math.min(trainSize, rows - 1);

        double[][] trainRows = new double[trainSize][];
        int[] trainLabels = new int[trainSize];
        for (int i = 0; i < trainSize; i++) {
            trainRows[i] = data.features()[order[i]];
            trainLabels[i] = data.labels()[order[i]];
        }
        int testSize = rows - trainSize;
        double[][] testRows = new double[testSize][];
        int[] testLabels = new int[testSize];
        for (int i = 0; i < testSize; i++) {
            testRows[i] = data.features()[order[trainSize + i]];
            testLabels[i] = data.labels()[order[trainSize + i]];
        }

        double[] means = new double[columns];
        double[] stds = new double[columns];
        for (int column = 0; column < columns; column++) {
            double sum = 0;
            for (double[] row : trainRows) {
                sum += row[column];
            }
            double mean = sum / trainRows.length;
            double variance = 0;
            for (double[] row : trainRows) {
                double delta = row[column] - mean;
                variance += delta * delta;
            }
            means[column] = mean;
            stds[column] = Math.sqrt(variance / Math.max(1, trainRows.length - 1));
        }

        double[][] trainX = standardise(trainRows, means, stds);
        double[][] testX = standardise(testRows, means, stds);

        TrainedArtifact artifact;
        double[] importances;
        int[] classes;
        if ("LogisticRegression".equals(algorithm)) {
            double c = hyperparameters.getOrDefault("C", 1.0);
            int iterations = (int) Math.round(hyperparameters.getOrDefault("max_iter", 1000.0));
            LogisticRegression.Binomial model = LogisticRegression.binomial(
                    trainX, trainLabels, 1.0 / Math.max(0.01, c), 1e-6, iterations);
            classes = model.classes();
            importances = normalise(logisticImportance(model, columns));
            artifact = TrainedArtifact.logistic(algorithm, features, means, stds, importances, model, classes);
        } else {
            DataFrame frame = SmileFrames.frame(trainX, trainLabels, features);
            Formula formula = Formula.of(SmileFrames.LABEL, features.toArray(new String[0]));
            Classifier<Tuple> model;
            if ("RandomForest".equals(algorithm)) {
                Properties properties = new Properties();
                properties.setProperty("smile.random_forest.trees",
                        String.valueOf((int) Math.round(hyperparameters.getOrDefault("n_estimators", 200.0))));
                properties.setProperty("smile.random_forest.max_depth",
                        String.valueOf((int) Math.round(hyperparameters.getOrDefault("max_depth", 12.0))));
                model = RandomForest.fit(formula, frame, properties);
                importances = normalise(((RandomForest) model).importance());
            } else {
                Properties properties = new Properties();
                properties.setProperty("smile.gradient_boost.trees",
                        String.valueOf((int) Math.round(hyperparameters.getOrDefault("n_estimators", 300.0))));
                properties.setProperty("smile.gradient_boost.shrinkage",
                        String.valueOf(hyperparameters.getOrDefault("learning_rate", 0.1)));
                model = GradientTreeBoost.fit(formula, frame, properties);
                importances = normalise(((GradientTreeBoost) model).importance());
            }
            classes = model.classes();
            artifact = TrainedArtifact.tree(algorithm, features, means, stds, importances, formula, model, classes);
        }

        TrainingMetrics metrics = evaluate(artifact, testX, testLabels, importances);
        log.info("Trained {} on {} rows ({} train / {} test): accuracy={}, f1={}, auc={}",
                algorithm, rows, trainSize, testSize,
                round(metrics.accuracy()), round(metrics.f1Score()), round(metrics.rocAuc()));
        return new TrainingResult(artifact, metrics);
    }

    private static TrainingMetrics evaluate(TrainedArtifact artifact, double[][] testX, int[] truth,
                                            double[] importances) {
        int tp = 0;
        int fp = 0;
        int fn = 0;
        int tn = 0;
        double[] scores = new double[truth.length];
        for (int i = 0; i < truth.length; i++) {
            double probability = artifact.successProbabilityStandardised(testX[i]);
            scores[i] = probability;
            boolean predictedPositive = probability >= 0.5;
            if (truth[i] == 1 && predictedPositive) {
                tp++;
            } else if (truth[i] == 1) {
                fn++;
            } else if (predictedPositive) {
                fp++;
            } else {
                tn++;
            }
        }
        double precision = tp + fp == 0 ? 0 : tp / (double) (tp + fp);
        double recall = tp + fn == 0 ? 0 : tp / (double) (tp + fn);
        double f1 = precision + recall == 0 ? 0 : 2 * precision * recall / (precision + recall);
        double accuracy = truth.length == 0 ? 0 : (tp + tn) / (double) truth.length;
        double auc = rocAuc(truth, scores);

        List<TrainingMetrics.FeatureImportance> featureImportance = new ArrayList<>();
        for (int i = 0; i < importances.length && i < FeatureSpec.FEATURES.size(); i++) {
            featureImportance.add(new TrainingMetrics.FeatureImportance(
                    FeatureSpec.FEATURES.get(i), round(importances[i])));
        }
        return new TrainingMetrics(round(accuracy), round(precision), round(recall), round(f1), round(auc),
                tp, fp, fn, tn, List.copyOf(featureImportance));
    }

    /** Standard coefficients are the first {@code p} entries; Smile appends the intercept. */
    private static double[] logisticImportance(LogisticRegression.Binomial model, int columns) {
        double[] coefficients = model.coefficients();
        double[] importance = new double[columns];
        for (int i = 0; i < columns && i < coefficients.length; i++) {
            importance[i] = Math.abs(coefficients[i]);
        }
        return importance;
    }

    private static double[] normalise(double[] values) {
        double[] result = new double[values.length];
        double total = 0;
        for (int i = 0; i < values.length; i++) {
            result[i] = Double.isFinite(values[i]) ? Math.abs(values[i]) : 0;
            total += result[i];
        }
        if (total <= 1e-12) {
            Arrays.fill(result, 1.0 / Math.max(1, values.length));
            return result;
        }
        for (int i = 0; i < result.length; i++) {
            result[i] = result[i] / total;
        }
        return result;
    }

    private static double[][] standardise(double[][] rows, double[] means, double[] stds) {
        double[][] result = new double[rows.length][means.length];
        for (int row = 0; row < rows.length; row++) {
            for (int column = 0; column < means.length; column++) {
                double std = stds[column] <= 1e-9 ? 1 : stds[column];
                result[row][column] = (rows[row][column] - means[column]) / std;
            }
        }
        return result;
    }

    private static void shuffle(int[] values, Random random) {
        for (int i = values.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            int swap = values[i];
            values[i] = values[j];
            values[j] = swap;
        }
    }

    /** Mann-Whitney rank AUC with average ranks for tied scores. */
    private static double rocAuc(int[] truth, double[] scores) {
        int n = truth.length;
        Integer[] order = new Integer[n];
        for (int i = 0; i < n; i++) {
            order[i] = i;
        }
        Arrays.sort(order, (a, b) -> Double.compare(scores[a], scores[b]));

        int positives = 0;
        int negatives = 0;
        for (int label : truth) {
            if (label == 1) {
                positives++;
            } else {
                negatives++;
            }
        }
        if (positives == 0 || negatives == 0) {
            return 0.5;
        }

        double rankSum = 0;
        int i = 0;
        while (i < n) {
            int j = i;
            while (j + 1 < n && Double.compare(scores[order[j + 1]], scores[order[i]]) == 0) {
                j++;
            }
            double averageRank = ((i + 1) + (j + 1)) / 2.0;
            for (int k = i; k <= j; k++) {
                if (truth[order[k]] == 1) {
                    rankSum += averageRank;
                }
            }
            i = j + 1;
        }
        return (rankSum - positives * (positives + 1) / 2.0) / (positives * (double) negatives);
    }

    private static double round(double value) {
        return Math.round(value * 1000.0) / 1000.0;
    }
}
