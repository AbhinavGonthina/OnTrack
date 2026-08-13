package com.ontrack.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ontrack.backend.dto.NoteRequest;
import com.ontrack.backend.dto.NoteResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.exception.ApplicationNotFoundException;
import com.ontrack.backend.repository.UserRepository;
import com.ontrack.backend.security.JwtService;
import com.ontrack.backend.service.NoteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NoteController.class)
class NoteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private NoteService noteService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    private User user;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        user = User.builder().id(UUID.randomUUID()).email("person@example.com").build();
        authentication = new UsernamePasswordAuthenticationToken(
                user, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @Test
    void addNoteReturns201() throws Exception {
        UUID appId = UUID.randomUUID();
        NoteResponse response = new NoteResponse(UUID.randomUUID(), "Follow up", Instant.now());
        when(noteService.addNote(eq(user.getId()), eq(appId), any(NoteRequest.class))).thenReturn(response);

        String body = objectMapper.writeValueAsString(new NoteRequest("Follow up"));

        mockMvc.perform(post("/api/applications/" + appId + "/notes")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.text").value("Follow up"));
    }

    @Test
    void addNoteReturns404WhenApplicationNotFound() throws Exception {
        UUID appId = UUID.randomUUID();
        when(noteService.addNote(eq(user.getId()), eq(appId), any(NoteRequest.class)))
                .thenThrow(new ApplicationNotFoundException(appId));

        String body = objectMapper.writeValueAsString(new NoteRequest("Follow up"));

        mockMvc.perform(post("/api/applications/" + appId + "/notes")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isNotFound());
    }

    @Test
    void addNoteWithBlankTextReturns400() throws Exception {
        UUID appId = UUID.randomUUID();
        String body = objectMapper.writeValueAsString(new NoteRequest(""));

        mockMvc.perform(post("/api/applications/" + appId + "/notes")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deleteNoteReturns204() throws Exception {
        UUID noteId = UUID.randomUUID();

        mockMvc.perform(delete("/api/notes/" + noteId)
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isNoContent());
    }
}
