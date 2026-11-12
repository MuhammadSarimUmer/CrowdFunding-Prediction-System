package com.crowdpredict.ml;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;

import smile.classification.Classifier;
import smile.classification.LogisticRegression;
import smile.data.Tuple;
import smile.data.formula.Formula;

/**
 * The serialised payload behind one {@code model_versions} row. It holds the trained
 * Smile classifier plus the preprocessing state (means and standard deviations) and
 * the absolute feature importances used by the explainability endpoint.
 *
 * <p>Predictions accept raw, un-standardised features in {@link FeatureSpec#FEATURES}
 * order so the feature contract only lives in one place.
 */
public class TrainedArtifact implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private final String algorithm;
    private final List<String> features;
    private final double[] means;
    private final double[] stds;
    private final double[] importances;
    private final int[] classes;

    private final LogisticRegression.Binomial logistic;
    private final Formula formula;
    private final Classifier<Tuple> tree;

    private TrainedArtifact(String algorithm, List<String> features, double[] means, double[] stds,
                            double[] importances, int[] classes, LogisticRegression.Binomial logistic,
                            Formula formula, Classifier<Tuple> tree) {
        this.algorithm = algorithm;
        this.features = List.copyOf(features);
        this.means = means;
        this.stds = stds;
        this.importances = importances;
        this.classes = classes;
        this.logistic = logistic;
        this.formula = formula;
        this.tree = tree;
    }

    public static TrainedArtifact logistic(String algorithm, List<String> features, double[] means,
                                           double[] stds, double[] importances,
                                           LogisticRegression.Binomial model, int[] classes) {
        return new TrainedArtifact(algorithm, features, means, stds, importances, classes,
                model, null, null);
    }

    public static TrainedArtifact tree(String algorithm, List<String> features, double[] means,
                                       double[] stds, double[] importances, Formula formula,
                                       Classifier<Tuple> model, int[] classes) {
        return new TrainedArtifact(algorithm, features, means, stds, importances, classes,
                null, formula, model);
    }

    public String getAlgorithm() {
        return algorithm;
    }

    public List<String> getFeatures() {
        return features;
    }

    public double[] getImportances() {
        return importances.clone();
    }

    public double[] standardise(double[] raw) {
        double[] result = new double[raw.length];
        for (int i = 0; i < raw.length && i < means.length; i++) {
            double std = stds[i] <= 1e-9 ? 1 : stds[i];
            result[i] = (raw[i] - means[i]) / std;
        }
        return result;
    }

    public double[] standardise(double[] raw, double[] output) {
        for (int i = 0; i < raw.length && i < means.length; i++) {
            double std = stds[i] <= 1e-9 ? 1 : stds[i];
            output[i] = (raw[i] - means[i]) / std;
        }
        return output;
    }

    /** Probability of the positive ("funded") class for one raw feature row. */
    public double successProbability(double[] rawFeatures) {
        double[] standardised = standardise(rawFeatures);
        return successProbabilityStandardised(standardised);
    }

    public double successProbabilityStandardised(double[] standardised) {
        double[] posteriori = new double[Math.max(2, classes.length)];
        if (logistic != null) {
            logistic.predict(standardised, posteriori);
        } else if (tree != null) {
            Tuple row = SmileFrames.singleRow(standardised, features);
            tree.predict(row, posteriori);
        } else {
            return 0.5;
        }
        return successIndex(posteriori);
    }

    private double successIndex(double[] posteriori) {
        int positive = -1;
        for (int i = 0; i < classes.length; i++) {
            if (classes[i] == 1) {
                positive = i;
                break;
            }
        }
        if (positive < 0) {
            positive = posteriori.length > 1 ? 1 : 0;
        }
        return positive < posteriori.length ? posteriori[positive] : 0.5;
    }

    public int[] getClasses() {
        return classes.clone();
    }

    /** Index of the "funded" class inside {@link #getClasses()}; falls back to the last class. */
    public int successClassIndex() {
        for (int i = 0; i < classes.length; i++) {
            if (classes[i] == 1) {
                return i;
            }
        }
        return classes.length > 1 ? classes.length - 1 : 0;
    }

    /** Raw logistic coefficients in feature order, or {@code null} for tree models. */
    public double[] logisticCoefficients() {
        if (logistic == null) {
            return null;
        }
        return logistic.coefficients();
    }

    public LogisticRegression.Binomial getLogistic() {
        return logistic;
    }

    public Formula getFormula() {
        return formula;
    }

    public Classifier<Tuple> getTree() {
        return tree;
    }
}
