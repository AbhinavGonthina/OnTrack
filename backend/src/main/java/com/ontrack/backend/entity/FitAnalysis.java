package com.ontrack.backend.entity;

import com.ontrack.backend.converter.StringListJsonConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Doubles as the Gemini response cache (keyed on inputHash, a SHA-256 of
 * resumeText + jobDescriptionText) and as the source of demo-mode results,
 * which are pre-seeded here and never trigger a live Gemini call.
 */
@Entity
@Table(name = "fit_analyses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FitAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(name = "input_hash", nullable = false, length = 64)
    private String inputHash;

    @Column(name = "fit_score", nullable = false)
    private Integer fitScore;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "missing_keywords", columnDefinition = "TEXT")
    private List<String> missingKeywords;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "suggested_bullets", columnDefinition = "TEXT")
    private List<String> suggestedBullets;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
