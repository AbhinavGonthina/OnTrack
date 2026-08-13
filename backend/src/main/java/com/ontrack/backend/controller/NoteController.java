package com.ontrack.backend.controller;

import com.ontrack.backend.dto.NoteRequest;
import com.ontrack.backend.dto.NoteResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.service.NoteService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @PostMapping("/api/applications/{applicationId}/notes")
    public ResponseEntity<NoteResponse> addNote(
            @AuthenticationPrincipal User user,
            @PathVariable UUID applicationId,
            @Valid @RequestBody NoteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(noteService.addNote(user.getId(), applicationId, request));
    }

    @DeleteMapping("/api/notes/{noteId}")
    public ResponseEntity<Void> deleteNote(@AuthenticationPrincipal User user, @PathVariable UUID noteId) {
        noteService.deleteNote(user.getId(), noteId);
        return ResponseEntity.noContent().build();
    }
}
