package com.crowdpredict.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.crowdpredict.domain.Pledge;

public interface PledgeRepository extends JpaRepository<Pledge, Long> {

    @Query("""
            select p from Pledge p
            left join fetch p.campaign c
            left join fetch c.creator
            left join fetch c.category
            left join fetch c.rewards
            left join fetch p.reward
            where p.user.userId = :userId
            order by p.createdAt desc
            """)
    List<Pledge> findMineWithCampaign(@Param("userId") Long userId);

    @Query("""
            select coalesce(sum(p.amount), 0) from Pledge p
            where p.user.userId = :userId
            """)
    java.math.BigDecimal sumAmountByUserId(@Param("userId") Long userId);
}
