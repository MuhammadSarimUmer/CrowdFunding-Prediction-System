package com.crowdpredict.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.crowdpredict.domain.Dataset;
import com.crowdpredict.domain.Role;
import com.crowdpredict.domain.User;
import com.crowdpredict.ml.CsvDatasetReader;
import com.crowdpredict.ml.CsvTrainingData;
import com.crowdpredict.repository.DatasetRepository;
import com.crowdpredict.repository.ModelVersionRepository;
import com.crowdpredict.repository.UserRepository;
import com.crowdpredict.security.AuthPrincipal;
import com.crowdpredict.security.CurrentUser;
import com.crowdpredict.web.dto.DatasetResponse;
import com.crowdpredict.web.error.ApiException;

/**
 * Dataset upload/list/delete. Files are stored on disk and only metadata is kept in the
 * database, which keeps the portable schema free of binary columns.
 */
@Service
public class DatasetService {

    private static final Logger log = LoggerFactory.getLogger(DatasetService.class);
    private static final long MAX_BYTES = 50L * 1024 * 1024;

    private final DatasetRepository datasetRepository;
    private final ModelVersionRepository modelVersionRepository;
    private final UserRepository userRepository;
    private final Path datasetDirectory;

    public DatasetService(DatasetRepository datasetRepository,
                          ModelVersionRepository modelVersionRepository,
                          UserRepository userRepository,
                          @Value("${app.storage.datasets}") String datasetDirectory) {
        this.datasetRepository = datasetRepository;
        this.modelVersionRepository = modelVersionRepository;
        this.userRepository = userRepository;
        this.datasetDirectory = Path.of(datasetDirectory).toAbsolutePath().normalize();
    }

    @Transactional(readOnly = true)
    public List<DatasetResponse> list() {
        requireAdmin();
        return datasetRepository.findAllByOrderByUploadedAtDesc().stream()
                .map(DatasetResponse::of)
                .toList();
    }

    @Transactional
    public DatasetResponse upload(MultipartFile file) {
        AuthPrincipal caller = requireAdmin();
        if (file == null || file.isEmpty()) {
            throw ApiException.invalidFields(Map.of("file", "Choose a CSV file to upload."));
        }
        String originalName = file.getOriginalFilename() == null ? "dataset.csv" : file.getOriginalFilename();
        if (!originalName.toLowerCase(Locale.ROOT).endsWith(".csv")) {
            throw new ApiException(400, "Only CSV files are supported.",
                    Map.of("file", "Only CSV files are supported."));
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ApiException(400, "Datasets must be 50 MB or smaller.",
                    Map.of("file", "Datasets must be 50 MB or smaller."));
        }

        Path target = null;
        try {
            Files.createDirectories(datasetDirectory);
            String safeName = originalName.replaceAll("[^A-Za-z0-9._-]", "_");
            target = datasetDirectory.resolve(UUID.randomUUID() + "-" + safeName);
            file.transferTo(target);

            CsvTrainingData data = CsvDatasetReader.read(target, originalName);
            User uploader = userRepository.findById(caller.userId())
                    .orElseThrow(() -> ApiException.unauthorized("Please sign in to continue."));

            Dataset dataset = new Dataset();
            dataset.setFileName(originalName);
            dataset.setStoragePath(target.toString());
            dataset.setRowCount(data.rowCount());
            dataset.setFeatureCount(data.featureCount());
            dataset.setStatus("validated");
            dataset.setUploadedBy(uploader);
            dataset.setUploadedAt(Instant.now());
            Dataset saved = datasetRepository.save(dataset);
            log.info("Stored dataset {} ({} rows) at {}", saved.getDatasetId(), saved.getRowCount(), target);
            return DatasetResponse.of(saved);
        } catch (ApiException ex) {
            deleteQuietly(target);
            throw ex;
        } catch (IOException ex) {
            deleteQuietly(target);
            log.warn("Dataset upload failed", ex);
            throw new ApiException(400, "The dataset could not be stored.",
                    Map.of("file", "The dataset could not be stored."));
        }
    }

    @Transactional
    public Map<String, Object> delete(Long datasetId) {
        requireAdmin();
        Dataset dataset = datasetRepository.findById(datasetId)
                .orElseThrow(() -> ApiException.notFound("Dataset not found."));
        if (modelVersionRepository.countByDatasetDatasetId(datasetId) > 0) {
            throw ApiException.badRequest("This dataset is used by a trained model and cannot be removed.");
        }
        deleteQuietly(dataset.getStoragePath() == null ? null : Path.of(dataset.getStoragePath()));
        datasetRepository.delete(dataset);
        return Map.of("success", true);
    }

    private AuthPrincipal requireAdmin() {
        AuthPrincipal caller = CurrentUser.require();
        if (caller.role() != Role.ADMIN) {
            throw ApiException.forbidden("You do not have permission to perform this action.");
        }
        return caller;
    }

    private void deleteQuietly(Path path) {
        if (path == null) {
            return;
        }
        try {
            Files.deleteIfExists(path);
        } catch (IOException ex) {
            log.debug("Could not delete {}: {}", path, ex.getMessage());
        }
    }
}
