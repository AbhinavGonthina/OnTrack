package com.ontrack.backend.repository;

import com.ontrack.backend.entity.StatusEvent;
import com.ontrack.backend.enums.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StatusEventRepository extends JpaRepository<StatusEvent, UUID> {

    List<StatusEvent> findByApplicationIdOrderByEventDateAscCreatedAtAsc(UUID applicationId);

    List<StatusEvent> findByApplication_User_IdOrderByEventDateAsc(UUID userId);

    /** Used to assign the next global interview round number for an application. */
    long countByApplicationIdAndStatus(UUID applicationId, ApplicationStatus status);

    Optional<StatusEvent> findByIdAndApplicationId(UUID id, UUID applicationId);

    /** Used to renumber remaining interview rounds contiguously after one is deleted. */
    List<StatusEvent> findByApplicationIdAndStatusOrderByEventDateAscCreatedAtAsc(
            UUID applicationId, ApplicationStatus status);
}
