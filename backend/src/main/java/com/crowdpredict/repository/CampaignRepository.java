package com.crowdpredict.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.crowdpredict.domain.Campaign;

public interface CampaignRepository extends JpaRepository<Campaign, Long> {

    /**
     * Loads everything a campaign response needs in one query. The list endpoint filters in
     * memory (see CampaignService) because the demo dataset is small and this keeps the
     * semantics identical to the reference frontend implementation.
     */
    @Query("""
            select distinct c from Campaign c
            left join fetch c.rewards
            left join fetch c.category
            left join fetch c.creator
            order by c.campaignId asc
            """)
    List<Campaign> findAllDetailed();

    @Query("""
            select c from Campaign c
            left join fetch c.rewards
            left join fetch c.category
            left join fetch c.creator
            where c.campaignId = :id
            """)
    Optional<Campaign> findDetailedById(@Param("id") Long id);
}
