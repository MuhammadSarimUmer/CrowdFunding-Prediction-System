package com.crowdpredict.service;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.crowdpredict.domain.Campaign;
import com.crowdpredict.domain.Pledge;
import com.crowdpredict.domain.Reward;
import com.crowdpredict.domain.User;
import com.crowdpredict.repository.CampaignRepository;
import com.crowdpredict.repository.PledgeRepository;
import com.crowdpredict.repository.UserRepository;
import com.crowdpredict.security.AuthPrincipal;
import com.crowdpredict.security.CurrentUser;
import com.crowdpredict.web.dto.PledgeRequest;
import com.crowdpredict.web.dto.PledgeResponse;
import com.crowdpredict.web.error.ApiException;

@Service
public class PledgeService {

    private final PledgeRepository pledgeRepository;
    private final CampaignRepository campaignRepository;
    private final UserRepository userRepository;

    public PledgeService(PledgeRepository pledgeRepository,
                         CampaignRepository campaignRepository,
                         UserRepository userRepository) {
        this.pledgeRepository = pledgeRepository;
        this.campaignRepository = campaignRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public PledgeResponse create(Long campaignId, PledgeRequest request) {
        AuthPrincipal caller = CurrentUser.require();
        Campaign campaign = campaignRepository.findDetailedById(campaignId)
                .orElseThrow(() -> ApiException.notFound("Campaign not found."));

        if (campaign.getStatus() != Campaign.Status.SUBMITTED) {
            throw ApiException.badRequest("This campaign is not accepting pledges yet.");
        }

        Map<String, String> errors = new LinkedHashMap<>();
        BigDecimal amount = request.amount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            errors.put("amount", "Enter a pledge amount.");
        }

        Reward reward = null;
        if (request.rewardId() != null) {
            reward = campaign.getRewards().stream()
                    .filter(item -> item.getRewardId().equals(request.rewardId()))
                    .findFirst()
                    .orElse(null);
            if (reward == null) {
                errors.put("rewardId", "That reward is no longer available.");
            } else if (amount != null && !reward.isAffordable(amount)) {
                errors.put("amount", "This reward requires at least $" + reward.getMinPledge() + ".");
            }
        }
        if (!errors.isEmpty()) {
            throw ApiException.invalidFields(errors);
        }

        User user = userRepository.findById(caller.userId())
                .orElseThrow(() -> ApiException.unauthorized("Please sign in to continue."));

        Pledge pledge = new Pledge();
        pledge.setUser(user);
        pledge.setCampaign(campaign);
        pledge.setReward(reward);
        pledge.setAmount(amount);
        pledgeRepository.save(pledge);

        campaign.setPledgedAmount(campaign.getPledgedAmount().add(amount));
        campaign.setBackerCount(campaign.getBackerCount() + 1);
        campaignRepository.save(campaign);

        return PledgeResponse.of(pledge);
    }

    @Transactional(readOnly = true)
    public List<PledgeResponse> mine() {
        Long userId = CurrentUser.require().userId();
        return pledgeRepository.findMineWithCampaign(userId).stream()
                .map(PledgeResponse::of)
                .toList();
    }
}
