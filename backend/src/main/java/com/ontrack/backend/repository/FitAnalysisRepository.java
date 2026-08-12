package com.ontrack.backend.repository;

import com.ontrack.backend.entity.FitAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FitAnalysisRepository extends JpaRepository<FitAnalysis, UUID> {

    Optional<FitAnalysis> findByApplicationIdAndInputHash(UUID applicationId, String inputHash);
}
