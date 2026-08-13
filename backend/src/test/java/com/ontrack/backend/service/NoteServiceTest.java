package com.ontrack.backend.service;

import com.ontrack.backend.dto.NoteRequest;
import com.ontrack.backend.dto.NoteResponse;
import com.ontrack.backend.entity.Application;
import com.ontrack.backend.entity.Note;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.exception.ApplicationNotFoundException;
import com.ontrack.backend.exception.NoteNotFoundException;
import com.ontrack.backend.repository.ApplicationRepository;
import com.ontrack.backend.repository.NoteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NoteServiceTest {

    @Mock
    private NoteRepository noteRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    private NoteService noteService;
    private User user;

    @BeforeEach
    void setUp() {
        noteService = new NoteService(noteRepository, applicationRepository);
        user = User.builder().id(UUID.randomUUID()).email("person@example.com").build();
    }

    @Test
    void addNoteSavesNoteOnOwnedApplication() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));
        when(noteRepository.save(any(Note.class))).thenAnswer(inv -> {
            Note note = inv.getArgument(0);
            note.setId(UUID.randomUUID());
            return note;
        });

        NoteResponse response = noteService.addNote(user.getId(), appId, new NoteRequest("Follow up next week"));

        assertThat(response.text()).isEqualTo("Follow up next week");
    }

    @Test
    void addNoteThrowsWhenApplicationNotOwned() {
        UUID appId = UUID.randomUUID();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> noteService.addNote(user.getId(), appId, new NoteRequest("text")))
                .isInstanceOf(ApplicationNotFoundException.class);
    }

    @Test
    void deleteNoteRemovesOwnedNote() {
        UUID noteId = UUID.randomUUID();
        Note note = Note.builder().id(noteId).build();
        when(noteRepository.findByIdAndApplication_User_Id(noteId, user.getId())).thenReturn(Optional.of(note));

        noteService.deleteNote(user.getId(), noteId);

        verify(noteRepository).delete(note);
    }

    @Test
    void deleteNoteThrowsWhenNotOwned() {
        UUID noteId = UUID.randomUUID();
        when(noteRepository.findByIdAndApplication_User_Id(noteId, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> noteService.deleteNote(user.getId(), noteId))
                .isInstanceOf(NoteNotFoundException.class);
    }
}
