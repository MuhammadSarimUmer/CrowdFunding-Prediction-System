package com.crowdpredict.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.crowdpredict.domain.Campaign;
import com.crowdpredict.domain.Prediction;
import com.crowdpredict.domain.Role;
import com.crowdpredict.ml.FeatureSpec;
import com.crowdpredict.ml.ModelRegistry;
import com.crowdpredict.repository.CampaignRepository;
import com.crowdpredict.repository.PredictionRepository;
import com.crowdpredict.security.AuthPrincipal;
import com.crowdpredict.security.CurrentUser;
import com.crowdpredict.web.dto.JsonPayload;
import com.crowdpredict.web.dto.PageResponse;
import com.crowdpredict.web.dto.PredictionResponse;
import com.crowdpredict.web.error.ApiException;

/**
 * Forecast creation and history. A forecast always uses the active model (or the
 * heuristic fallback before the first training run), promotes drafts to submitted, and
 * stores the signed factor contributions as JSON so results are reproducible.
 */
@Service
public class PredictionService {

    private static final double MIN_PROBABILITY = 0.05;
    private static final double MAX_PROBABILITY = 0.97;

    private final PredictionRepository predictionRepository;
    private final CampaignRepository campaignRepository;
    private final ModelRegistry modelRegistry;

    public PredictionService(PredictionRepository predictionRepository,
                             CampaignRepository campaignRepository,
                             ModelRegistry modelRegistry) {
        this.predictionRepository = predictionRepository;
        this.campaignRepository = campaignRepository;
        this.modelRegistry = modelRegistry;
    }

    @Transactional
    public PredictionResponse create(Long campaignId) {
        AuthPrincipal caller = requireCreatorOrAdmin();
        Campaign campaign = campaignRepository.findDetailedById(campaignId)
                .orElseThrow(() -> ApiException.notFound("Campaign not found."));
        if (caller.role() != Role.ADMIN && !campaign.getCreator().getUserId().equals(caller.userId())) {
            throw ApiException.forbidden("You can only evaluate your own campaigns.");
        }

        double[] features = FeatureSpec.fromCampaign(campaign);
        ModelRegistry.LoadedModel model = modelRegistry.active();
        double probability = clamp(round(model.probability(features)), MIN_PROBABILITY, MAX_PROBABILITY);
        Map<String, Double> factors = model.factors(features);

        Prediction prediction = new Prediction();
        prediction.setCampaign(campaign);
        prediction.setModelVersion(model.version());
        prediction.setProbability(probability);
        prediction.setLabel(probability >= 0.5 ? "Likely Success" : "Likely Fail");
        prediction.setTopFactors(JsonPayload.write(factors));
        prediction.setExplanation(explain(model, probability, factors));
        prediction.setCreatedAt(Instant.now());
        predictionRepository.save(prediction);

        if (campaign.getStatus() == Campaign.Status.DRAFT) {
            campaign.setStatus(Campaign.Status.SUBMITTED);
            campaign.setUpdatedAt(Instant.now());
            campaignRepository.save(campaign);
        }
        return PredictionResponse.of(prediction);
    }

    @Transactional(readOnly = true)
    public PageResponse<PredictionResponse> list(int page, int pageSize, Long campaignId) {
        AuthPrincipal caller = requireCreatorOrAdmin();
        List<Prediction> predictions = predictionRepository.findAllDetailed();

        if (caller.role() != Role.ADMIN) {
            predictions = predictions.stream()
                    .filter(prediction -> prediction.getCampaign() != null
                            && prediction.getCampaign().getCreator() != null
                            && prediction.getCampaign().getCreator().getUserId().equals(caller.userId()))
                    .toList();
        }
        if (campaignId != null) {
            predictions = predictions.stream()
                    .filter(prediction -> campaignId.equals(prediction.getCampaign().getCampaignId()))
                    .toList();
        }

        List<PredictionResponse> responses = new ArrayList<>();
        for (Prediction prediction : predictions) {
            responses.add(PredictionResponse.of(prediction));
        }
        return PageResponse.of(responses, page, pageSize);
    }

    @Transactional(readOnly = true)
    public PredictionResponse get(Long predictionId) {
        AuthPrincipal caller = requireCreatorOrAdmin();
        Prediction prediction = predictionRepository.findDetailedById(predictionId)
                .orElseThrow(() -> ApiException.notFound("Prediction not found."));
        boolean owner = prediction.getCampaign() != null
                && prediction.getCampaign().getCreator() != null
                && prediction.getCampaign().getCreator().getUserId().equals(caller.userId());
        if (caller.role() != Role.ADMIN && !owner) {
            throw ApiException.forbidden("You do not have access to this prediction.");
        }
        return PredictionResponse.of(prediction);
    }

    private String explain(ModelRegistry.LoadedModel model, double probability, Map<String, Double> factors) {
        String direction = probability >= 0.5 ? "succeed" : "fall short";
        String factor = factors.isEmpty() ? "goal size" : factors.keySet().iterator().next();
        return String.format(
                "The %s model estimates a %d%% chance this campaign will %s. "
                        + "The strongest signal is %s; review the factor chart for the full breakdown.",
                model.name(), Math.round(probability * 100), direction, factor);
    }

    private AuthPrincipal requireCreatorOrAdmin() {
        AuthPrincipal caller = CurrentUser.require();
        if (caller.role() != Role.CREATOR && caller.role() != Role.ADMIN) {
            throw ApiException.forbidden("Only campaign creators can request predictions.");
        }
        return caller;
    }

    private static double clamp(double value, double min, double max) {
        return Math.min(max, Math.max(min, value));
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
