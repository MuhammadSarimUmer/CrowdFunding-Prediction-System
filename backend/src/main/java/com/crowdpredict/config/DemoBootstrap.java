package com.crowdpredict.config;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.crowdpredict.domain.Campaign;
import com.crowdpredict.domain.Dataset;
import com.crowdpredict.domain.ModelVersion;
import com.crowdpredict.domain.Pledge;
import com.crowdpredict.domain.Prediction;
import com.crowdpredict.domain.Reward;
import com.crowdpredict.domain.Role;
import com.crowdpredict.domain.User;
import com.crowdpredict.ml.FeatureSpec;
import com.crowdpredict.ml.Hyperparameters;
import com.crowdpredict.ml.ModelRegistry;
import com.crowdpredict.repository.CampaignRepository;
import com.crowdpredict.repository.DatasetRepository;
import com.crowdpredict.repository.ModelVersionRepository;
import com.crowdpredict.repository.PledgeRepository;
import com.crowdpredict.repository.PredictionRepository;
import com.crowdpredict.repository.UserRepository;
import com.crowdpredict.service.TrainingService;
import com.crowdpredict.web.dto.JsonPayload;

/**
 * Seeds the ML side of the demo: two synthetic but realistic CSV datasets, three trained
 * model versions (Logistic Regression, Random Forest, XGBoost) with Random Forest active,
 * six forecasts and the eight pledges from the frontend mock.
 *
 * <p>Each block is independent and idempotent, so an existing database that only has
 * users/campaigns (for example the Neon instance) still gets datasets and models without
 * touching the real rows.
 */
@Component
@Order(2)
@ConditionalOnProperty(name = "app.seed.demo", havingValue = "true", matchIfMissing = true)
public class DemoBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoBootstrap.class);

    private final UserRepository userRepository;
    private final CampaignRepository campaignRepository;
    private final DatasetRepository datasetRepository;
    private final ModelVersionRepository modelVersionRepository;
    private final PredictionRepository predictionRepository;
    private final PledgeRepository pledgeRepository;
    private final TrainingService trainingService;
    private final ModelRegistry modelRegistry;
    private final Path datasetDirectory;

    public DemoBootstrap(UserRepository userRepository,
                         CampaignRepository campaignRepository,
                         DatasetRepository datasetRepository,
                         ModelVersionRepository modelVersionRepository,
                         PredictionRepository predictionRepository,
                         PledgeRepository pledgeRepository,
                         TrainingService trainingService,
                         ModelRegistry modelRegistry,
                         @Value("${app.storage.datasets}") String datasetDirectory) {
        this.userRepository = userRepository;
        this.campaignRepository = campaignRepository;
        this.datasetRepository = datasetRepository;
        this.modelVersionRepository = modelVersionRepository;
        this.predictionRepository = predictionRepository;
        this.pledgeRepository = pledgeRepository;
        this.trainingService = trainingService;
        this.modelRegistry = modelRegistry;
        this.datasetDirectory = Path.of(datasetDirectory).toAbsolutePath().normalize();
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<Dataset> datasets = seedDatasets();
        seedModels(datasets);
        seedPredictions();
        seedPledges();
    }

    private List<Dataset> seedDatasets() {
        List<Dataset> existing = datasetRepository.findAllByOrderByUploadedAtDesc();
        if (!existing.isEmpty()) {
            return existing;
        }
        User admin = userRepository.findAll().stream()
                .filter(user -> user.getRole() == Role.ADMIN)
                .findFirst()
                .orElse(null);
        try {
            Files.createDirectories(datasetDirectory);
            List<Dataset> datasets = new ArrayList<>();
            datasets.add(dataset("crowdfunding_global_2024_master.csv", 800, 11L, admin, 30));
            datasets.add(dataset("hardware_cleantech_pakistan_subsample.csv", 400, 7L, admin, 22));
            datasetRepository.saveAll(datasets);
            log.info("Seeded {} demo datasets into {}", datasets.size(), datasetDirectory);
            return datasets;
        } catch (IOException ex) {
            log.warn("Could not create demo datasets: {}", ex.getMessage());
            return List.of();
        }
    }

    private Dataset dataset(String fileName, int rows, long seed, User admin, int daysAgo) throws IOException {
        Path file = datasetDirectory.resolve("demo-" + seed + "-" + fileName);
        generateCsv(file, rows, seed);
        Dataset dataset = new Dataset();
        dataset.setFileName(fileName);
        dataset.setStoragePath(file.toString());
        dataset.setRowCount(rows);
        dataset.setFeatureCount(FeatureSpec.FEATURES.size());
        dataset.setStatus("validated");
        dataset.setUploadedBy(admin);
        dataset.setUploadedAt(Instant.now().minus(Duration.ofDays(daysAgo)));
        return dataset;
    }

    private void generateCsv(Path file, int rows, long seed) throws IOException {
        Random random = new Random(seed);
        List<String> countries = FeatureSpec.COUNTRIES;
        StringBuilder csv = new StringBuilder(
                "goalAmount,durationDays,rewardCount,descriptionLength,titleLength,backerCount,categoryId,country,success\n");
        for (int i = 0; i < rows; i++) {
            int goal = 2000 + random.nextInt(78000);
            int days = 10 + random.nextInt(51);
            int rewards = 1 + random.nextInt(6);
            int description = 80 + random.nextInt(520);
            int title = 10 + random.nextInt(70);
            int backers = random.nextInt(1200);
            int category = 1 + random.nextInt(7);
            String country = countries.get(random.nextInt(countries.size()));

            double pace = goal / (double) days;
            boolean optimalWindow = days >= 21 && days <= 45;
            double score = 2.0 * (
                    1.2 * (0.5 - goal / 80000.0)
                            + 0.8 * ((optimalWindow ? 1 : 0) - 0.5)
                            + 0.7 * (0.5 - Math.min(1, pace / 1500.0))
                            + 0.6 * (rewards / 6.0 - 0.5)
                            + 0.5 * (Math.min(1, description / 400.0) - 0.5)
                            + 0.9 * (Math.min(1, backers / 800.0) - 0.5)
                            + 0.35 * (random.nextDouble() - 0.5));
            int success = random.nextDouble() < sigmoid(score) ? 1 : 0;

            csv.append(goal).append(',')
                    .append(days).append(',')
                    .append(rewards).append(',')
                    .append(description).append(',')
                    .append(title).append(',')
                    .append(backers).append(',')
                    .append(category).append(',')
                    .append(country).append(',')
                    .append(success).append('\n');
        }
        Files.writeString(file, csv.toString(), StandardCharsets.UTF_8);
    }

    private void seedModels(List<Dataset> datasets) {
        if (datasets.isEmpty()) {
            log.warn("Skipping model seeding: no dataset is available");
            return;
        }
        if (modelVersionRepository.count() == 0) {
            Dataset dataset = datasets.get(datasets.size() - 1);
            String[] algorithms = { "LogisticRegression", "RandomForest", "XGBoost" };
            int[] daysAgo = { 100, 70, 20 };
            for (int i = 0; i < algorithms.length; i++) {
                String algorithm = algorithms[i];
                int ageDays = daysAgo[i];
                try {
                    var response = trainingService.trainForBootstrap(
                            algorithm, dataset, Map.of());
                    modelVersionRepository.findDetailedById(response.versionId()).ifPresent(model -> {
                        model.setCreatedAt(Instant.now().minus(Duration.ofDays(ageDays)));
                        modelVersionRepository.save(model);
                    });
                } catch (RuntimeException ex) {
                    log.warn("Could not train demo model {}: {}", algorithm, ex.getMessage());
                }
            }
        }
        if (modelVersionRepository.findByActiveTrue().isEmpty()) {
            ModelVersion active = modelVersionRepository
                    .findFirstByAlgorithmOrderByVersionIdDesc("RandomForest")
                    .orElseGet(() -> modelVersionRepository.findAll().stream()
                            .findFirst().orElse(null));
            if (active != null) {
                active.setActive(true);
                modelVersionRepository.save(active);
                log.info("Activated demo model {} ({})", active.getVersionId(), active.getName());
            }
        }
    }

    private void seedPredictions() {
        if (predictionRepository.count() > 0) {
            return;
        }
        ModelRegistry.LoadedModel model = modelRegistry.active();
        List<Campaign> campaigns = campaignRepository.findAllDetailed().stream()
                .filter(campaign -> campaign.getStatus() == Campaign.Status.SUBMITTED)
                .sorted((a, b) -> a.getCampaignId().compareTo(b.getCampaignId()))
                .limit(6)
                .toList();
        int index = 0;
        for (Campaign campaign : campaigns) {
            double[] features = FeatureSpec.fromCampaign(campaign);
            double probability = Math.round(Math.min(0.97, Math.max(0.05, model.probability(features))) * 100.0) / 100.0;
            Prediction prediction = new Prediction();
            prediction.setCampaign(campaign);
            prediction.setModelVersion(model.version());
            prediction.setProbability(probability);
            prediction.setLabel(probability >= 0.5 ? "Likely Success" : "Likely Fail");
            prediction.setTopFactors(JsonPayload.write(model.factors(features)));
            prediction.setExplanation("Demo forecast generated by " + model.name()
                    + " when the application started.");
            prediction.setCreatedAt(Instant.now().minus(Duration.ofHours(6L * index + 3)));
            predictionRepository.save(prediction);
            index++;
        }
        log.info("Seeded {} demo predictions with model {}", index, model.name());
    }

    private void seedPledges() {
        if (pledgeRepository.count() > 0) {
            return;
        }
        Map<String, User> users = new HashMap<>();
        userRepository.findAll().forEach(user -> users.put(user.getEmail().toLowerCase(Locale.ROOT), user));
        record SeedPledge(String email, long campaignId, int rewardIndex, int amount, int daysAgo) {
        }
        List<SeedPledge> seeds = List.of(
                new SeedPledge("backer@crowdpredict.app", 1L, 0, 25, 10),
                new SeedPledge("backer@crowdpredict.app", 2L, 0, 145, 7),
                new SeedPledge("backer@crowdpredict.app", 6L, 0, 120, 4),
                new SeedPledge("backer@crowdpredict.app", 5L, 0, 80, 2),
                new SeedPledge("omar@example.com", 1L, 1, 45, 8),
                new SeedPledge("hana@example.com", 5L, 2, 900, 5),
                new SeedPledge("marcus@crowdpredict.app", 2L, 0, 95, 3),
                new SeedPledge("layla@example.com", 7L, 1, 60, 1));

        int created = 0;
        for (SeedPledge seed : seeds) {
            User user = users.get(seed.email());
            if (user == null) {
                continue;
            }
            Campaign campaign = campaignRepository.findDetailedById(seed.campaignId()).orElse(null);
            if (campaign == null) {
                continue;
            }
            Reward reward = campaign.getRewards().isEmpty()
                    ? null
                    : campaign.getRewards().get(Math.min(seed.rewardIndex(), campaign.getRewards().size() - 1));
            Pledge pledge = new Pledge();
            pledge.setUser(user);
            pledge.setCampaign(campaign);
            pledge.setReward(reward);
            pledge.setAmount(BigDecimal.valueOf(seed.amount()));
            pledge.setCreatedAt(Instant.now().minus(Duration.ofDays(seed.daysAgo())));
            pledgeRepository.save(pledge);
            created++;
        }
        log.info("Seeded {} demo pledges", created);
    }

    private static double sigmoid(double value) {
        return 1.0 / (1.0 + Math.exp(-value));
    }

    /** Keeps the compiler honest about the defaults used by the demo models. */
    static Map<String, Double> defaultHyperparameters(String algorithm) {
        return Hyperparameters.resolve(algorithm, Map.of());
    }
}
