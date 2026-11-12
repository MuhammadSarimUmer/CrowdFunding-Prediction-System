package com.crowdpredict.web.dto;

import java.util.Map;

/** Body of {@code POST /api/admin/models/train}. */
public record TrainModelRequest(String algorithm, Long datasetId, Map<String, Object> hyperparameters) {
}
