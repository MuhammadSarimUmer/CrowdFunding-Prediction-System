package com.crowdpredict.ml;

import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.crowdpredict.domain.Campaign;
import com.crowdpredict.domain.ModelVersion;
import com.crowdpredict.repository.ModelVersionRepository;

/**
 * Loads serialised {@link TrainedArtifact}s on demand and exposes the active model.
 * Artifacts are cached by version id; the heuristic fallback keeps predictions working
 * even when the artifact file is missing or unreadable.
 */
@Component
public class ModelRegistry {

    private static final Logger log = LoggerFactory.getLogger(ModelRegistry.class);

    private final ModelVersionRepository modelVersionRepository;
    private final Path modelDirectory;
    private final Map<Long, Optional<TrainedArtifact>> cache = new ConcurrentHashMap<>();

    public ModelRegistry(ModelVersionRepository modelVersionRepository,
                         @Value("${app.storage.models}") String modelDirectory) {
        this.modelVersionRepository = modelVersionRepository;
        this.modelDirectory = Path.of(modelDirectory).toAbsolutePath().normalize();
    }

    public Path modelDirectory() {
        return modelDirectory;
    }

    /** The model selected on the admin screen, or an empty fallback before the first train. */
    public LoadedModel active() {
        return modelVersionRepository.findFirstByActiveTrue()
                .map(this::loaded)
                .orElseGet(() -> new LoadedModel(null, null));
    }

    public LoadedModel loaded(ModelVersion version) {
        return new LoadedModel(version, artifact(version).orElse(null));
    }

    public Optional<TrainedArtifact> artifact(ModelVersion version) {
        if (version == null || version.getVersionId() == null) {
            return Optional.empty();
        }
        return cache.computeIfAbsent(version.getVersionId(), id -> read(version));
    }

    public void evict(Long versionId) {
        if (versionId != null) {
            cache.remove(versionId);
        }
    }

    /** Persists the artifact next to the other models and returns the stored path. */
    public String save(ModelVersion version, TrainedArtifact artifact) {
        try {
            Files.createDirectories(modelDirectory);
            Path target = modelDirectory.resolve("model-" + version.getVersionId() + ".ser");
            try (ObjectOutputStream out = new ObjectOutputStream(Files.newOutputStream(target))) {
                out.writeObject(artifact);
            }
            evict(version.getVersionId());
            return target.toString();
        } catch (IOException ex) {
            throw new IllegalStateException("Could not store the trained model: " + ex.getMessage(), ex);
        }
    }

    private Optional<TrainedArtifact> read(ModelVersion version) {
        String path = version.getArtifactPath();
        if (path == null || path.isBlank()) {
            return Optional.empty();
        }
        Path file = Path.of(path);
        if (!Files.isReadable(file)) {
            log.warn("Model artifact for version {} is missing at {}", version.getVersionId(), path);
            return Optional.empty();
        }
        try (ObjectInputStream in = new ObjectInputStream(Files.newInputStream(file))) {
            Object value = in.readObject();
            if (value instanceof TrainedArtifact artifact) {
                return Optional.of(artifact);
            }
            log.warn("Model artifact for version {} has an unexpected type", version.getVersionId());
        } catch (IOException | ClassNotFoundException | RuntimeException ex) {
            log.warn("Could not load model artifact for version {}: {}", version.getVersionId(), ex.getMessage());
        }
        return Optional.empty();
    }

    /** Active (or fallback) model bound to the prediction request. */
    public record LoadedModel(ModelVersion version, TrainedArtifact artifact) {

        public boolean hasModel() {
            return version != null;
        }

        public double probability(double[] rawFeatures) {
            if (artifact != null) {
                return artifact.successProbability(rawFeatures);
            }
            return HeuristicPredictor.probability(rawFeatures);
        }

        public Map<String, Double> factors(double[] rawFeatures) {
            if (artifact != null) {
                return Explainer.explain(artifact, rawFeatures);
            }
            return HeuristicPredictor.factors(rawFeatures);
        }

        public List<String> features() {
            return artifact == null ? FeatureSpec.FEATURES : artifact.getFeatures();
        }

        public String name() {
            if (version == null) {
                return "Heuristic v1";
            }
            return version.getName() == null ? version.getVersion() : version.getName();
        }

        public String algorithm() {
            return version == null ? "Heuristic" : version.getAlgorithm();
        }

        public double[] campaignFeatures(Campaign campaign) {
            return FeatureSpec.fromCampaign(campaign);
        }
    }
}
