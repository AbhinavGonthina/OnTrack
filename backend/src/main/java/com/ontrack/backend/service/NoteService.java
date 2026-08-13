package com.ontrack.backend.service;

import com.ontrack.backend.dto.NoteRequest;
import com.ontrack.backend.dto.NoteResponse;
import com.ontrack.backend.entity.Application;
import com.ontrack.backend.entity.Note;
import com.ontrack.backend.exception.ApplicationNotFoundException;
import com.ontrack.backend.exception.NoteNotFoundException;
import com.ontrack.backend.repository.ApplicationRepository;
import com.ontrack.backend.repository.NoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class NoteService {

    private final NoteRepository noteRepository;
    private final ApplicationRepository applicationRepository;

    public NoteService(NoteRepository noteRepository, ApplicationRepository applicationRepository) {
        this.noteRepository = noteRepository;
        this.applicationRepository = applicationRepository;
    }

    @Transactional
    public NoteResponse addNote(UUID userId, UUID applicationId, NoteRequest request) {
        Application application = applicationRepository.findByIdAndUserId(applicationId, userId)
                .orElseThrow(() -> new ApplicationNotFoundException(applicationId));

        Note note = Note.builder()
                .application(application)
                .text(request.text())
                .build();
        note = noteRepository.save(note);

        return new NoteResponse(note.getId(), note.getText(), note.getCreatedAt());
    }

    @Transactional
    public void deleteNote(UUID userId, UUID noteId) {
        Note note = noteRepository.findByIdAndApplication_User_Id(noteId, userId)
                .orElseThrow(() -> new NoteNotFoundException(noteId));
        noteRepository.delete(note);
    }
}
