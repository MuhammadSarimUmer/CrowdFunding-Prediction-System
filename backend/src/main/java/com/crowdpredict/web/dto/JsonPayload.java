package com.crowdpredict.web.dto;

import java.util.LinkedHashMap;
import java.util.Map;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Tiny JSON helper for the TEXT columns used as portable maps. */
public final class JsonPayload {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private JsonPayload() {
    }

    public static Map<String, Object> readObject(String json) {
        if (json == null || json.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return MAPPER.readValue(json, new TypeReference<LinkedHashMap<String, Object>>() {
            });
        } catch (Exception ex) {
            return new LinkedHashMap<>();
        }
    }

    public static Map<String, Double> readFractions(String json) {
        Map<String, Double> result = new LinkedHashMap<>();
        readObject(json).forEach((key, value) -> {
            if (value instanceof Number number) {
                result.put(key, number.doubleValue());
            } else {
                try {
                    result.put(key, Double.parseDouble(String.valueOf(value)));
                } catch (NumberFormatException ignored) {
                    // skip unusable values
                }
            }
        });
        return result;
    }

    public static String write(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (Exception ex) {
            return "{}";
        }
    }
}
