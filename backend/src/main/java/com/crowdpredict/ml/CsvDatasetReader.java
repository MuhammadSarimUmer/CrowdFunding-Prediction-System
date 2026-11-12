package com.crowdpredict.ml;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import com.crowdpredict.web.error.ApiException;

/**
 * Minimal RFC-4180 CSV reader for the training set. It is deliberately forgiving:
 * unknown columns are ignored, rows with an unusable label are skipped, and missing
 * optional columns fall back to zero. Header names are normalised (case, spaces and
 * punctuation removed) so real-world exports such as {@code Goal Amount} still work.
 */
public final class CsvDatasetReader {

    private static final int MIN_ROWS = 10;

    private CsvDatasetReader() {
    }

    public static CsvTrainingData read(Path path, String fileName) {
        try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            List<String> headerLine = readRecord(reader);
            if (headerLine == null || headerLine.isEmpty()) {
                throw ApiException.invalidFields(Map.of("file", "The dataset is empty."));
            }
            Map<String, Integer> columns = new HashMap<>();
            for (int i = 0; i < headerLine.size(); i++) {
                columns.put(normalize(headerLine.get(i)), i);
            }
            if (!columns.containsKey("success")) {
                throw ApiException.invalidFields(Map.of(
                        "file", "Datasets need a 'success' column with 1 for funded and 0 for failed campaigns."));
            }

            List<double[]> features = new ArrayList<>();
            List<Integer> labels = new ArrayList<>();
            List<String> record;
            while ((record = readRecord(reader)) != null) {
                if (record.isEmpty() || record.stream().allMatch(String::isBlank)) {
                    continue;
                }
                Integer label = intAt(record, columns, "success");
                if (label == null || (label != 0 && label != 1)) {
                    continue;
                }
                Double goal = numberAt(record, columns, "goalamount");
                Double days = numberAt(record, columns, "durationdays");
                if (goal == null || days == null) {
                    continue;
                }
                double rewards = orZero(numberAt(record, columns, "rewardcount", "rewardtiers"));
                double descriptionLength = orZero(numberAt(record, columns, "descriptionlength"));
                double titleLength = orZero(numberAt(record, columns, "titlelength"));
                double backers = orZero(numberAt(record, columns, "backercount", "backervelocity"));
                double categoryId = orZero(numberAt(record, columns, "categoryid", "category"));
                String country = textAt(record, columns, "country");
                features.add(FeatureSpec.fromValues(goal, days, rewards, descriptionLength,
                        titleLength, backers, categoryId, country));
                labels.add(label);
            }

            if (features.size() < MIN_ROWS) {
                throw ApiException.invalidFields(Map.of(
                        "file", "The dataset needs at least " + MIN_ROWS
                                + " usable rows with goal amount, duration and a 0/1 success label."));
            }

            int[] y = new int[labels.size()];
            for (int i = 0; i < y.length; i++) {
                y[i] = labels.get(i);
            }
            boolean hasBothClasses = java.util.Arrays.stream(y).distinct().count() == 2;
            if (!hasBothClasses) {
                throw ApiException.invalidFields(Map.of(
                        "file", "The dataset must contain both funded and failed campaigns."));
            }
            return new CsvTrainingData(features.toArray(new double[0][]), y, features.size(),
                    FeatureSpec.FEATURES.size());
        } catch (IOException ex) {
            throw ApiException.invalidFields(Map.of("file", "The file could not be read (" + fileName + ")."));
        }
    }

    /** Reads one CSV record, honouring quoted fields. Returns {@code null} at end of file. */
    private static List<String> readRecord(BufferedReader reader) throws IOException {
        String line = reader.readLine();
        while (line != null && line.isBlank()) {
            line = reader.readLine();
        }
        if (line == null) {
            return null;
        }
        StringBuilder buffer = new StringBuilder(line);
        // A record ends only when the number of quotes is even.
        while (buffer.indexOf("\"") >= 0 && countQuotes(buffer) % 2 != 0) {
            String next = reader.readLine();
            if (next == null) {
                break;
            }
            buffer.append('\n').append(next);
        }

        List<String> values = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean quoted = false;
        String text = buffer.toString();
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (quoted) {
                if (c == '"') {
                    if (i + 1 < text.length() && text.charAt(i + 1) == '"') {
                        field.append('"');
                        i++;
                    } else {
                        quoted = false;
                    }
                } else {
                    field.append(c);
                }
            } else if (c == '"') {
                quoted = true;
            } else if (c == ',') {
                values.add(field.toString().trim());
                field.setLength(0);
            } else if (c != '\r') {
                field.append(c);
            }
        }
        values.add(field.toString().trim());
        return values;
    }

    private static int countQuotes(StringBuilder buffer) {
        int count = 0;
        for (int i = 0; i < buffer.length(); i++) {
            if (buffer.charAt(i) == '"') {
                count++;
            }
        }
        return count;
    }

    private static String normalize(String header) {
        if (header == null) {
            return "";
        }
        String stripped = header.replace("\uFEFF", "").toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        return switch (stripped) {
            case "goal" -> "goalamount";
            case "days", "duration" -> "durationdays";
            case "rewards", "rewardtiers", "numrewards" -> "rewardcount";
            case "backers", "backervelocity", "backercount" -> "backercount";
            case "descriptionlength", "desc_length" -> "descriptionlength";
            case "label", "outcome", "funded" -> "success";
            default -> stripped;
        };
    }

    private static Integer intAt(List<String> record, Map<String, Integer> columns, String key) {
        Double value = numberAt(record, columns, key);
        return value == null ? null : (int) Math.round(value);
    }

    private static Double numberAt(List<String> record, Map<String, Integer> columns, String... keys) {
        for (String key : keys) {
            Integer index = columns.get(key);
            if (index == null || index >= record.size()) {
                continue;
            }
            String raw = record.get(index);
            if (raw == null || raw.isBlank()) {
                continue;
            }
            try {
                return Double.parseDouble(raw.replace("$", "").replace(",", "").trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private static String textAt(List<String> record, Map<String, Integer> columns, String key) {
        Integer index = columns.get(key);
        if (index == null || index >= record.size()) {
            return null;
        }
        return record.get(index);
    }

    private static double orZero(Double value) {
        return value == null ? 0 : value;
    }
}
