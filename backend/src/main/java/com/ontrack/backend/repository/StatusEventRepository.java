package com.ontrack.backend.repository;

import com.ontrack.backend.entity.StatusEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StatusEventRepository extends JpaRepository<StatusEvent, UUID> {

    List<StatusEvent> findByApplicationIdOrderByEventDateAscCreatedAtAsc(UUID applicationId);

    List<StatusEvent> findByApplication_User_IdOrderByEventDateAsc(UUID userId);
}
