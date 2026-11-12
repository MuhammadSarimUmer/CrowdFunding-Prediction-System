package com.crowdpredict.ml;

import java.util.List;

import smile.data.DataFrame;
import smile.data.Tuple;
import smile.data.vector.BaseVector;
import smile.data.vector.DoubleVector;
import smile.data.vector.IntVector;

/** Small helpers that keep the Smile data-frame boilerplate in one place. */
final class SmileFrames {

    static final String LABEL = "label";

    private SmileFrames() {
    }

    static DataFrame frame(double[][] standardisedRows, int[] labels, List<String> features) {
        BaseVector<?, ?, ?>[] columns = new BaseVector<?, ?, ?>[features.size() + 1];
        for (int column = 0; column < features.size(); column++) {
            double[] values = new double[standardisedRows.length];
            for (int row = 0; row < standardisedRows.length; row++) {
                values[row] = standardisedRows[row][column];
            }
            columns[column] = DoubleVector.of(features.get(column), values);
        }
        columns[features.size()] = IntVector.of(LABEL, labels);
        return DataFrame.of(columns);
    }

    static Tuple singleRow(double[] standardisedRow, List<String> features) {
        return frame(new double[][] { standardisedRow }, new int[] { 0 }, features).get(0);
    }
}
