package com.crowdpredict.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.crowdpredict.domain.Campaign;
import com.crowdpredict.domain.Category;
import com.crowdpredict.domain.Prediction;
import com.crowdpredict.domain.Reward;
import com.crowdpredict.domain.Role;
import com.crowdpredict.domain.User;
import com.crowdpredict.ml.FeatureSpec;
import com.crowdpredict.repository.CampaignRepository;
import com.crowdpredict.repository.CategoryRepository;
import com.crowdpredict.repository.PredictionRepository;
import com.crowdpredict.repository.UserRepository;
import com.crowdpredict.security.AuthPrincipal;
import com.crowdpredict.security.CurrentUser;
import com.crowdpredict.web.dto.CampaignRequest;
import com.crowdpredict.web.dto.CampaignResponse;
import com.crowdpredict.web.dto.PageResponse;
import com.crowdpredict.web.dto.PredictionResponse;
import com.crowdpredict.web.dto.RewardInput;
import com.crowdpredict.web.error.ApiException;

@Service
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final PredictionRepository predictionRepository;

    public CampaignService(CampaignRepository campaignRepository,
                           CategoryRepository categoryRepository,
                           UserRepository userRepository,
                           PredictionRepository predictionRepository) {
        this.campaignRepository = campaignRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.predictionRepository = predictionRepository;
    }

    /**
     * Mirrors the reference implementation: drafts are only visible to their owner or an admin,
     * search spans title/description/category/creator, and {@code category} matches either the
     * name or the numeric id. Filtering happens in memory because the demo dataset is tiny.
     */
    @Transactional(readOnly = true)
    public PageResponse<CampaignResponse> list(CampaignFilter filter) {
        AuthPrincipal caller = CurrentUser.orNull();
        List<Campaign> campaigns = campaignRepository.findAllDetailed();

        if (filter.mine()) {
            AuthPrincipal owner = CurrentUser.require();
            campaigns = campaigns.stream()
                    .filter(campaign -> campaign.getCreator().getUserId().equals(owner.userId()))
                    .toList();
        }
        if (caller == null || caller.role() != Role.ADMIN) {
            campaigns = campaigns.stream()
                    .filter(campaign -> campaign.getStatus() != Campaign.Status.DRAFT
                            || (caller != null && campaign.getCreator().getUserId().equals(caller.userId())))
                    .toList();
        }

        String search = normalize(filter.search());
        String category = normalize(filter.category());
        String country = filter.country() == null ? "" : filter.country().trim();

        List<CampaignResponse> responses = new ArrayList<>();
        for (Campaign campaign : campaigns) {
            String categoryName = campaign.getCategory() == null ? ""
                    : campaign.getCategory().getName().toLowerCase(Locale.ROOT);
            String creatorName = campaign.getCreator() == null ? ""
                    : campaign.getCreator().getName().toLowerCase(Locale.ROOT);

            if (!search.isEmpty()) {
                String haystack = (campaign.getTitle() + " " + campaign.getDescription() + " "
                        + categoryName + " " + creatorName).toLowerCase(Locale.ROOT);
                if (!haystack.contains(search)) {
                    continue;
                }
            }
            if (!category.isEmpty()
                    && !category.equals(categoryName)
                    && !category.equals(String.valueOf(campaign.getCategory() == null
                            ? null : campaign.getCategory().getCategoryId()))) {
                continue;
            }
            if (!country.isEmpty() && !country.equals(campaign.getCountry())) {
                continue;
            }
            if (filter.minGoal() != null && campaign.getGoalAmount().compareTo(filter.minGoal()) < 0) {
                continue;
            }
            if (filter.maxGoal() != null && campaign.getGoalAmount().compareTo(filter.maxGoal()) > 0) {
                continue;
            }
            responses.add(respond(campaign));
        }

        return PageResponse.of(responses, filter.page(), filter.pageSize());
    }

    @Transactional(readOnly = true)
    public CampaignResponse get(Long campaignId) {
        Campaign campaign = campaignRepository.findDetailedById(campaignId)
                .orElseThrow(() -> ApiException.notFound("Campaign not found."));

        if (campaign.getStatus() == Campaign.Status.DRAFT) {
            AuthPrincipal caller = CurrentUser.orNull();
            boolean allowed = caller != null
                    && (caller.role() == Role.ADMIN || campaign.getCreator().getUserId().equals(caller.userId()));
            if (!allowed) {
                throw ApiException.notFound("Campaign not found.");
            }
        }
        return respond(campaign);
    }

    /** {@code GET /api/campaigns?mine=true} alias used by the creator screens. */
    @Transactional(readOnly = true)
    public PageResponse<CampaignResponse> mine() {
        return list(new CampaignFilter(true, null, null, null, null, null, null, 1, 100));
    }

    @Transactional
    public CampaignResponse create(CampaignRequest request) {
        requireCreatorOrAdmin();
        AuthPrincipal caller = CurrentUser.require();

        Campaign campaign = new Campaign();
        campaign.setTitle(trim(request.title()));
        campaign.setDescription(trim(request.description()));
        campaign.setGoalAmount(request.goalAmount());
        campaign.setDurationDays(request.durationDays());
        campaign.setCountry(normaliseCountry(request.country()));
        campaign.setStatus(Campaign.Status.fromCode(request.status()) == Campaign.Status.SUBMITTED
                ? Campaign.Status.SUBMITTED
                : Campaign.Status.DRAFT);
        campaign.setPledgedAmount(BigDecimal.ZERO);
        campaign.setBackerCount(0);
        campaign.setCreatedAt(Instant.now());
        campaign.setEndsAt(Instant.now().plus(
                Math.max(1, request.durationDays() == null ? 1 : request.durationDays()), ChronoUnit.DAYS));

        List<Reward> rewards = buildRewards(request.rewards());
        rewards.forEach(reward -> reward.setCampaign(campaign));
        campaign.setRewards(rewards);

        applyCategoryAndValidation(campaign, request.categoryId());

        User creator = userRepository.findById(caller.userId())
                .orElseThrow(() -> ApiException.unauthorized("Please sign in to continue."));
        campaign.setCreator(creator);

        return respond(campaignRepository.save(campaign));
    }

    @Transactional
    public CampaignResponse update(Long campaignId, CampaignRequest request) {
        requireCreatorOrAdmin();
        AuthPrincipal caller = CurrentUser.require();

        Campaign campaign = campaignRepository.findDetailedById(campaignId)
                .orElseThrow(() -> ApiException.notFound("Campaign not found."));

        boolean owner = campaign.getCreator().getUserId().equals(caller.userId());
        if (caller.role() != Role.ADMIN && !owner) {
            throw ApiException.forbidden("You can only edit your own campaigns.");
        }

        if (request.title() != null) {
            campaign.setTitle(trim(request.title()));
        }
        if (request.description() != null) {
            campaign.setDescription(trim(request.description()));
        }
        if (request.goalAmount() != null) {
            campaign.setGoalAmount(request.goalAmount());
        }
        if (request.durationDays() != null) {
            campaign.setDurationDays(request.durationDays());
        }
        if (request.country() != null) {
            campaign.setCountry(normaliseCountry(request.country()));
        }
        if (request.status() != null) {
            campaign.setStatus(Campaign.Status.fromCode(request.status()) == Campaign.Status.SUBMITTED
                    ? Campaign.Status.SUBMITTED
                    : Campaign.Status.DRAFT);
        }
        if (request.rewards() != null) {
            List<Reward> rewards = buildRewards(request.rewards());
            campaign.getRewards().clear();
            rewards.forEach(reward -> reward.setCampaign(campaign));
            campaign.getRewards().addAll(rewards);
        }

        applyCategoryAndValidation(campaign, request.categoryId());
        campaign.setUpdatedAt(Instant.now());
        return respond(campaignRepository.save(campaign));
    }

    @Transactional
    public Map<String, Object> delete(Long campaignId) {
        requireCreatorOrAdmin();
        AuthPrincipal caller = CurrentUser.require();

        Campaign campaign = campaignRepository.findDetailedById(campaignId)
                .orElseThrow(() -> ApiException.notFound("Campaign not found."));

        boolean owner = campaign.getCreator().getUserId().equals(caller.userId());
        if (caller.role() != Role.ADMIN && !owner) {
            throw ApiException.forbidden("You can only delete your own campaigns.");
        }
        campaignRepository.delete(campaign);
        return Map.of("success", true);
    }

    /** Embeds the newest forecast so cards/details show a live badge. */
    private CampaignResponse respond(Campaign campaign) {
        if (campaign.getCampaignId() == null) {
            return CampaignResponse.of(campaign);
        }
        Prediction latest = predictionRepository
                .findFirstByCampaignCampaignIdOrderByCreatedAtDesc(campaign.getCampaignId())
                .orElse(null);
        return CampaignResponse.of(campaign,
                latest == null ? null : PredictionResponse.of(latest));
    }

    private void applyCategoryAndValidation(Campaign campaign, Long categoryId) {
        Long resolvedCategoryId = categoryId != null
                ? categoryId
                : campaign.getCategory() == null ? null : campaign.getCategory().getCategoryId();

        Map<String, String> errors = validate(campaign);
        Category category = resolvedCategoryId == null
                ? null
                : categoryRepository.findById(resolvedCategoryId).orElse(null);
        if (category == null) {
            errors.put("categoryId", "Choose a valid category.");
        }
        if (!errors.isEmpty()) {
            throw ApiException.invalidFields(errors);
        }
        campaign.setCategory(category);
    }

    private Map<String, String> validate(Campaign campaign) {
        Map<String, String> errors = new LinkedHashMap<>();
        if (isBlank(campaign.getTitle())) {
            errors.put("title", "Campaign title is required.");
        }
        if (campaign.getDescription() == null || campaign.getDescription().trim().length() < 80) {
            errors.put("description", "Add at least 80 characters so backers understand the pitch.");
        }
        if (campaign.getGoalAmount() == null || campaign.getGoalAmount().compareTo(BigDecimal.valueOf(100)) < 0) {
            errors.put("goalAmount", "Set a funding goal of at least $100.");
        }
        if (campaign.getDurationDays() == null
                || campaign.getDurationDays() < 1 || campaign.getDurationDays() > 60) {
            errors.put("durationDays", "Campaigns must run between 1 and 60 days.");
        }
        if (isBlank(campaign.getCountry())
                || !FeatureSpec.COUNTRIES.contains(campaign.getCountry().trim().toUpperCase(Locale.ROOT))) {
            errors.put("country", "Choose a market country.");
        }
        if (campaign.getRewards() == null || campaign.getRewards().isEmpty()) {
            errors.put("rewards", "Add at least one reward tier.");
        } else {
            for (int index = 0; index < campaign.getRewards().size(); index++) {
                Reward reward = campaign.getRewards().get(index);
                if (reward.getDescription() == null || reward.getDescription().isBlank()) {
                    errors.put("rewards." + index + ".description", "Describe this reward.");
                }
                if (reward.getMinPledge() == null || reward.getMinPledge().compareTo(BigDecimal.ZERO) <= 0) {
                    errors.put("rewards." + index + ".minPledge", "Minimum pledge must be greater than zero.");
                }
            }
        }
        return errors;
    }

    private List<Reward> buildRewards(List<RewardInput> inputs) {
        List<Reward> rewards = new ArrayList<>();
        if (inputs == null) {
            return rewards;
        }
        for (RewardInput input : inputs) {
            Reward reward = new Reward();
            reward.setTitle(isBlank(input.title()) ? null : input.title().trim());
            reward.setDescription(isBlank(input.description()) ? "" : input.description().trim());
            reward.setMinPledge(input.minPledge());
            reward.setQuantity(input.quantity());
            rewards.add(reward);
        }
        return rewards;
    }

    private void requireCreatorOrAdmin() {
        AuthPrincipal caller = CurrentUser.require();
        if (caller.role() != Role.CREATOR && caller.role() != Role.ADMIN) {
            throw ApiException.forbidden("Only campaign creators can manage campaigns.");
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    /** Countries are stored as the two-letter ISO code the feature extractor expects. */
    private static String normaliseCountry(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    private static String trim(String value) {
        return value == null ? null : value.trim();
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
