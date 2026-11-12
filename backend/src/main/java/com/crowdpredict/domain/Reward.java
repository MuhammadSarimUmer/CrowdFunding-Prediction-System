package com.crowdpredict.domain;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * A pledge tier. UML: {@code Reward.isAffordable(amount)} is used by pledge validation —
 * a backer may not pick a tier and then pledge below its minimum.
 */
@Entity
@Table(name = "rewards")
public class Reward {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reward_id")
    private Long rewardId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @Column(length = 160)
    private String title;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(name = "min_pledge", nullable = false, precision = 14, scale = 2)
    private BigDecimal minPledge;

    private Integer quantity;

    public Long getRewardId() {
        return rewardId;
    }

    public void setRewardId(Long rewardId) {
        this.rewardId = rewardId;
    }

    public Campaign getCampaign() {
        return campaign;
    }

    public void setCampaign(Campaign campaign) {
        this.campaign = campaign;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getMinPledge() {
        return minPledge;
    }

    public void setMinPledge(BigDecimal minPledge) {
        this.minPledge = minPledge;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    /** UML: {@code Reward.isAffordable(a)}. */
    public boolean isAffordable(BigDecimal amount) {
        return amount != null && minPledge != null && amount.compareTo(minPledge) >= 0;
    }
}
