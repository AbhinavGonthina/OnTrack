package com.ontrack.backend.entity;

import com.ontrack.backend.converter.CategoryScoreListJsonConverter;
import com.ontrack.backend.converter.StringListJsonConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
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
 * The cached Gemini strength score for a user's resume, keyed by a hash of the exact text that
 * was scored. One row per user: this answers "how strong is the resume you have now", so the
 * primary key is the user id and re-scoring overwrites in place.
 */
@Entity
@Table(name = "resume_strengths")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResumeStrength {

    /** Assigned, not generated: this is the user id, which is what makes it one row per user. */
    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "input_hash", nullable = false, length = 64)
    private String inputHash;

    @Column(name = "score", nullable = false)
    private Integer score;

    @Convert(converter = CategoryScoreListJsonConverter.class)
    @Column(name = "categories", columnDefinition = "TEXT", nullable = false)
    private List<CategoryScore> categories;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "recommendations", columnDefinition = "TEXT", nullable = false)
    private List<String> recommendations;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    /** Stored as JSON in the categories column. Mirrors the four fixed categories Gemini returns. */
    public record CategoryScore(String name, int score, String feedback) {
    }
}
