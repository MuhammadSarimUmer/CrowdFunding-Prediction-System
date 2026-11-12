package com.crowdpredict.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.crowdpredict.domain.ModelVersion;

public interface ModelVersionRepository extends JpaRepository<ModelVersion, Long> {

    @Query("select m from ModelVersion m left join fetch m.dataset order by m.createdAt desc")
    List<ModelVersion> findAllDetailed();

    @Query("select m from ModelVersion m left join fetch m.dataset where m.versionId = :versionId")
    Optional<ModelVersion> findDetailedById(Long versionId);

    Optional<ModelVersion> findFirstByActiveTrue();

    Optional<ModelVersion> findFirstByAlgorithmOrderByVersionIdDesc(String algorithm);

    long countByAlgorithm(String algorithm);

    long countByDatasetDatasetId(Long datasetId);

    List<ModelVersion> findByActiveTrue();
}
