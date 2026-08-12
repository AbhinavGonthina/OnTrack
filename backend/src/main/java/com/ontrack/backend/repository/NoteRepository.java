package com.ontrack.backend.repository;

import com.ontrack.backend.entity.Note;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NoteRepository extends JpaRepository<Note, UUID> {

    List<Note> findByApplicationIdOrderByCreatedAtDesc(UUID applicationId);
}
