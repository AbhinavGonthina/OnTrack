package com.ontrack.backend.repository;

import com.ontrack.backend.entity.ResumeStrength;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ResumeStrengthRepository extends JpaRepository<ResumeStrength, UUID> {

    /**
     * Matching on the hash as well as the user is what keeps a stale score from being served:
     * a row whose hash no longer matches the user's current resume simply isn't found.
     */
    Optional<ResumeStrength> findByUserIdAndInputHash(UUID userId, String inputHash);
}
