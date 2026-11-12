package com.crowdpredict.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.crowdpredict.domain.Dataset;

public interface DatasetRepository extends JpaRepository<Dataset, Long> {

    List<Dataset> findAllByOrderByUploadedAtDesc();

    boolean existsByFileName(String fileName);
}
