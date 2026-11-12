package com.crowdpredict.web.dto;

import java.time.Instant;
import java.util.Map;

import com.crowdpredict.domain.ModelVersion;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * One trained model version. {@code name}/{@code version} feed the model table and the
 * active-model card, while {@code hyperparameters} is the map the training screen sent.
 */
public record ModelResponse(
        Long versionId,
        String algorithm,
        String name,
        String version,
        double accuracy,
        double f1Score,
        Double precision,
        Double recall,
        Double rocAuc,
        Long datasetId,
        String datasetName,
        @JsonProperty("isActive") boolean isActive,
        Instant createdAt,
        String trainingStatus,
        Map<String, Object> hyperparameters) {

    public static ModelResponse of(ModelVersion model) {
        return new ModelResponse(
                model.getVersionId(),
                model.getAlgorithm(),
                model.getName(),
                model.getVersion(),
                model.getAccuracy(),
                model.getF1Score(),
                model.getPrecision(),
                model.getRecall(),
                model.getRocAuc(),
                model.getDataset() == null ? null : model.getDataset().getDatasetId(),
                model.getDataset() == null ? null : model.getDataset().getFileName(),
                model.isActive(),
                model.getCreatedAt(),
                model.getTrainingStatus(),
                JsonPayload.readObject(model.getHyperparameters()));
    }
}
