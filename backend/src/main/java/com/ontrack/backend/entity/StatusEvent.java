package com.ontrack.backend.entity;

import com.ontrack.backend.enums.ApplicationStatus;
import com.ontrack.backend.enums.InterviewFormat;
import com.ontrack.backend.enums.InterviewType;
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
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Rows are normally only inserted, never edited - this history is what powers
 * /api/stats and the Sankey funnel (see SPEC.md). A row can be deleted (so a user can
 * correct a mistaken entry), which may also trigger a renumbering of the interviewRound
 * on the remaining INTERVIEW rows for the same application - see
 * ApplicationService#deleteStatusEvent.
 */
@Entity
@Table(name = "status_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StatusEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ApplicationStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "rejected_from_stage", length = 20)
    private ApplicationStatus rejectedFromStage;

    @Column(name = "interview_round")
    private Integer interviewRound;

    @Enumerated(EnumType.STRING)
    @Column(name = "interview_type", length = 20)
    private InterviewType interviewType;

    @Enumerated(EnumType.STRING)
    @Column(name = "interview_format", length = 20)
    private InterviewFormat interviewFormat;

    @Column(name = "event_date", nullable = false)
    private LocalDate eventDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
