package com.crowdpredict.web.dto;

import java.time.Instant;

import com.crowdpredict.domain.Dataset;

/**
 * Dataset metadata as the admin screens read it. The column is called {@code features}
 * (not {@code featureCount}) to match the frontend type.
 */
public record DatasetResponse(
        Long datasetId,
        String fileName,
        int rowCount,
        int features,
        Instant uploadedAt,
        String uploadedBy,
        String status) {

    public static DatasetResponse of(Dataset dataset) {
        return new DatasetResponse(
                dataset.getDatasetId(),
                dataset.getFileName(),
                dataset.getRowCount(),
                dataset.getFeatureCount(),
                dataset.getUploadedAt(),
                dataset.getUploadedBy() == null ? null : dataset.getUploadedBy().getName(),
                dataset.getStatus());
    }
}
