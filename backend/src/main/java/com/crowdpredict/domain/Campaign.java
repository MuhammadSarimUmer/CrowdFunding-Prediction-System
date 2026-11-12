package com.crowdpredict.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "campaigns")
public class Campaign {

    /** The frontend only knows these two states. */
    public enum Status {
        DRAFT("DRAFT"),
        SUBMITTED("SUBMITTED");

        private final String code;

        Status(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }

        public static Status fromCode(String value) {
            if (value == null) {
                return null;
            }
            return switch (value.trim().toUpperCase(java.util.Locale.ROOT)) {
                case "DRAFT" -> DRAFT;
                case "SUBMITTED" -> SUBMITTED;
                default -> null;
            };
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "campaign_id")
    private Long campaignId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "goal_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal goalAmount;

    @Column(name = "duration_days", nullable = false)
    private Integer durationDays;

    @Column(nullable = false, length = 2)
    private String country;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.DRAFT;

    @Column(name = "pledged_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal pledgedAmount = BigDecimal.ZERO;

    @Column(name = "backer_count", nullable = false)
    private int backerCount;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "ends_at")
    private Instant endsAt;

    @OneToMany(mappedBy = "campaign", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("rewardId ASC")
    private List<Reward> rewards = new ArrayList<>();

    public Long getCampaignId() {
        return campaignId;
    }

    public void setCampaignId(Long campaignId) {
        this.campaignId = campaignId;
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

    public BigDecimal getGoalAmount() {
        return goalAmount;
    }

    public void setGoalAmount(BigDecimal goalAmount) {
        this.goalAmount = goalAmount;
    }

    public Integer getDurationDays() {
        return durationDays;
    }

    public void setDurationDays(Integer durationDays) {
        this.durationDays = durationDays;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public User getCreator() {
        return creator;
    }

    public void setCreator(User creator) {
        this.creator = creator;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public BigDecimal getPledgedAmount() {
        return pledgedAmount;
    }

    public void setPledgedAmount(BigDecimal pledgedAmount) {
        this.pledgedAmount = pledgedAmount;
    }

    public int getBackerCount() {
        return backerCount;
    }

    public void setBackerCount(int backerCount) {
        this.backerCount = backerCount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public void setEndsAt(Instant endsAt) {
        this.endsAt = endsAt;
    }

    public List<Reward> getRewards() {
        return rewards;
    }

    public void setRewards(List<Reward> rewards) {
        this.rewards = rewards;
    }

    /** UML: {@code Campaign.getGoalPerDay()} — derived, never stored. */
    public BigDecimal goalPerDay() {
        int days = durationDays == null || durationDays < 1 ? 1 : durationDays;
        return goalAmount == null
                ? BigDecimal.ZERO
                : goalAmount.divide(BigDecimal.valueOf(days), 2, java.math.RoundingMode.HALF_UP);
    }

    @PrePersist
    @PreUpdate
    void touch() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (status == null) {
            status = Status.DRAFT;
        }
        if (pledgedAmount == null) {
            pledgedAmount = BigDecimal.ZERO;
        }
        if (country != null) {
            country = country.trim().toUpperCase(java.util.Locale.ROOT);
        }
    }
}
