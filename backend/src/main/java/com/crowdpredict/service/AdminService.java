package com.crowdpredict.service;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.crowdpredict.domain.Campaign;
import com.crowdpredict.domain.Dataset;
import com.crowdpredict.domain.ModelVersion;
import com.crowdpredict.domain.Role;
import com.crowdpredict.domain.User;
import com.crowdpredict.repository.CampaignRepository;
import com.crowdpredict.repository.DatasetRepository;
import com.crowdpredict.repository.ModelVersionRepository;
import com.crowdpredict.repository.PledgeRepository;
import com.crowdpredict.repository.PredictionRepository;
import com.crowdpredict.repository.UserRepository;
import com.crowdpredict.security.AuthPrincipal;
import com.crowdpredict.security.CurrentUser;
import com.crowdpredict.web.dto.AdminStatsResponse;
import com.crowdpredict.web.dto.RoleUpdateRequest;
import com.crowdpredict.web.dto.StatusUpdateRequest;
import com.crowdpredict.web.dto.UserResponse;
import com.crowdpredict.web.error.ApiException;

/** Admin dashboard aggregates and user management. */
@Service
public class AdminService {

    private final UserRepository userRepository;
    private final CampaignRepository campaignRepository;
    private final PredictionRepository predictionRepository;
    private final ModelVersionRepository modelVersionRepository;
    private final DatasetRepository datasetRepository;
    private final PledgeRepository pledgeRepository;

    public AdminService(UserRepository userRepository,
                        CampaignRepository campaignRepository,
                        PredictionRepository predictionRepository,
                        ModelVersionRepository modelVersionRepository,
                        DatasetRepository datasetRepository,
                        PledgeRepository pledgeRepository) {
        this.userRepository = userRepository;
        this.campaignRepository = campaignRepository;
        this.predictionRepository = predictionRepository;
        this.modelVersionRepository = modelVersionRepository;
        this.datasetRepository = datasetRepository;
        this.pledgeRepository = pledgeRepository;
    }

    @Transactional(readOnly = true)
    public AdminStatsResponse stats() {
        requireAdmin();
        List<User> users = userRepository.findAll();
        List<Campaign> campaigns = campaignRepository.findAllDetailed();
        List<Dataset> datasets = datasetRepository.findAll();
        ModelVersion activeModel = modelVersionRepository.findFirstByActiveTrue().orElse(null);

        long totalPredictions = predictionRepository.count();
        double averageProbability = Math.round(predictionRepository.averageProbability() * 100.0) / 100.0;

        return AdminStatsResponse.of(
                users.size(),
                users.stream().filter(user -> user.getRole() == Role.BACKER).count(),
                users.stream().filter(user -> user.getRole() == Role.CREATOR).count(),
                users.stream().filter(user -> user.getRole() == Role.ADMIN).count(),
                users.stream().filter(User::isActive).count(),
                campaigns.size(),
                predictionRepository.countDistinctCampaigns(),
                campaigns.stream().filter(campaign -> campaign.getStatus() == Campaign.Status.SUBMITTED).count(),
                campaigns.stream().filter(campaign -> campaign.getStatus() == Campaign.Status.DRAFT).count(),
                totalPredictions,
                averageProbability,
                predictionRepository.countByProbabilityGreaterThanEqual(0.5),
                modelVersionRepository.count(),
                activeModel == null ? null : activeModel.getName(),
                activeModel == null ? null : activeModel.getAlgorithm(),
                activeModel == null ? 0 : activeModel.getAccuracy(),
                activeModel == null ? 0 : activeModel.getF1Score(),
                datasets.size(),
                datasets.stream().mapToLong(Dataset::getRowCount).sum());
    }

    @Transactional(readOnly = true)
    public List<UserResponse> users(String search) {
        requireAdmin();
        String needle = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return userRepository.findAll().stream()
                .filter(user -> needle.isEmpty() || (
                        user.getName() + " " + user.getEmail() + " "
                                + (user.getOrganization() == null ? "" : user.getOrganization()) + " "
                                + user.getRole().code())
                        .toLowerCase(Locale.ROOT).contains(needle))
                .sorted(Comparator.comparing(User::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::withPledges)
                .toList();
    }

    @Transactional
    public UserResponse updateRole(Long userId, RoleUpdateRequest request) {
        requireAdmin();
        User target = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found."));
        Role role = parseRole(request == null ? null : request.role());
        if (role == null) {
            throw new ApiException(400, "Please check the highlighted fields.",
                    Map.of("role", "Choose a valid role."));
        }
        if (target.getRole() == Role.ADMIN && role != Role.ADMIN && activeAdmins() <= 1) {
            throw ApiException.badRequest("At least one active administrator is required.");
        }
        target.setRole(role);
        return withPledges(userRepository.save(target));
    }

    @Transactional
    public UserResponse updateStatus(Long userId, StatusUpdateRequest request) {
        AuthPrincipal caller = requireAdmin();
        User target = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found."));
        if (request == null || request.isActive() == null) {
            throw new ApiException(400, "Please check the highlighted fields.",
                    Map.of("isActive", "Choose a valid account status."));
        }
        if (target.getUserId().equals(caller.userId()) && !request.isActive()) {
            throw ApiException.badRequest("You cannot deactivate your own account.");
        }
        target.setActive(request.isActive());
        return withPledges(userRepository.save(target));
    }

    private UserResponse withPledges(User user) {
        BigDecimal total = pledgeRepository.sumAmountByUserId(user.getUserId());
        return UserResponse.withTotalPledged(user, total == null ? BigDecimal.ZERO : total);
    }

    private long activeAdmins() {
        return userRepository.findAll().stream()
                .filter(user -> user.getRole() == Role.ADMIN && user.isActive())
                .count();
    }

    private Role parseRole(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return switch (value.trim().toLowerCase(Locale.ROOT)) {
            case "backer" -> Role.BACKER;
            case "creator" -> Role.CREATOR;
            case "admin" -> Role.ADMIN;
            default -> null;
        };
    }

    private AuthPrincipal requireAdmin() {
        AuthPrincipal caller = CurrentUser.require();
        if (caller.role() != Role.ADMIN) {
            throw ApiException.forbidden("You do not have permission to perform this action.");
        }
        return caller;
    }
}
