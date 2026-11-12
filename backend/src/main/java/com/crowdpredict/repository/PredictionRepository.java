package com.crowdpredict.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.crowdpredict.domain.Prediction;

public interface PredictionRepository extends JpaRepository<Prediction, Long> {

    @Query("""
            select distinct p from Prediction p
            left join fetch p.modelVersion
            left join fetch p.campaign c
            left join fetch c.creator
            left join fetch c.category
            left join fetch c.rewards
            order by p.createdAt desc
            """)
    List<Prediction> findAllDetailed();

    @Query("""
            select distinct p from Prediction p
            left join fetch p.modelVersion
            left join fetch p.campaign c
            left join fetch c.creator
            left join fetch c.category
            left join fetch c.rewards
            where p.predictionId = :predictionId
            """)
    Optional<Prediction> findDetailedById(Long predictionId);

    @Query("select count(distinct p.campaign.campaignId) from Prediction p")
    long countDistinctCampaigns();

    @Query("select coalesce(avg(p.probability), 0) from Prediction p")
    double averageProbability();

    long countByProbabilityGreaterThanEqual(double threshold);

    Optional<Prediction> findFirstByCampaignCampaignIdOrderByCreatedAtDesc(Long campaignId);
}
