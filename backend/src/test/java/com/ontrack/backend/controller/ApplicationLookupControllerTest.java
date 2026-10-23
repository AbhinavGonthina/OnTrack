package com.ontrack.backend.controller;

import com.ontrack.backend.config.SecurityConfig;
import com.ontrack.backend.dto.ApplicationResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.enums.ApplicationStatus;
import com.ontrack.backend.repository.UserRepository;
import com.ontrack.backend.security.JwtService;
import com.ontrack.backend.service.ApplicationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ApplicationController.class)
@Import(SecurityConfig.class)
class ApplicationLookupControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ApplicationService applicationService;
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

    private ApplicationResponse existing() {
        return new ApplicationResponse(
                UUID.randomUUID(), "Acme", "Engineer", "A job.",
                "https://jobs.lever.co/acme/abc", LocalDate.of(2026, 10, 1),
                ApplicationStatus.APPLIED, Instant.now(), Instant.now());
    }

    @Test
    void returnsTheMatchWhenThePostingIsAlreadyLogged() throws Exception {
        when(applicationService.findByCanonicalUrl(eq(user.getId()), any()))
                .thenReturn(Optional.of(existing()));

        mockMvc.perform(get("/api/applications/lookup")
                        .param("url", "https://jobs.lever.co/acme/abc")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.match.company").value("Acme"))
                .andExpect(jsonPath("$.match.role").value("Engineer"));
    }

    /**
     * A miss is a 200 with a null match, not a 404. The extension asks this every time the
     * popup opens and "no" is the normal answer.
     */
    @Test
    void returnsNullMatchRatherThanNotFoundWhenThePostingIsNew() throws Exception {
        when(applicationService.findByCanonicalUrl(eq(user.getId()), any()))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/applications/lookup")
                        .param("url", "https://jobs.lever.co/acme/new")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.match").doesNotExist());
    }

    @Test
    void requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/applications/lookup").param("url", "https://x.com/j/1"))
                .andExpect(status().isForbidden());

        verify(applicationService, never()).findByCanonicalUrl(any(), any());
    }

    @Test
    void rejectsABlankUrl() throws Exception {
        mockMvc.perform(get("/api/applications/lookup")
                        .param("url", "   ")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsAMissingUrlParameter() throws Exception {
        mockMvc.perform(get("/api/applications/lookup")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isBadRequest());
    }

    /**
     * The routing hazard this endpoint introduced. GET /api/applications/{id} takes a UUID, so
     * if "lookup" were bound to that template instead, every lookup would fail trying to parse
     * "lookup" as a UUID. Spring prefers a literal segment over a template, and this pins it
     * down: the lookup handler runs and the detail handler never does.
     */
    @Test
    void lookupIsNotParsedAsAnApplicationId() throws Exception {
        when(applicationService.findByCanonicalUrl(eq(user.getId()), any()))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/applications/lookup")
                        .param("url", "https://jobs.lever.co/acme/abc")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isOk());

        verify(applicationService).findByCanonicalUrl(eq(user.getId()), any());
        verify(applicationService, never()).getDetail(any(), any());
    }

    @Test
    void stillRoutesARealIdToTheDetailHandler() throws Exception {
        UUID id = UUID.randomUUID();
        mockMvc.perform(get("/api/applications/" + id)
                .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)));

        verify(applicationService).getDetail(user.getId(), id);
        verify(applicationService, never()).findByCanonicalUrl(any(), any());
    }

    @Test
    void passesTheRawUrlThroughForTheServiceToCanonicalize() throws Exception {
        when(applicationService.findByCanonicalUrl(eq(user.getId()), any()))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/applications/lookup")
                        .param("url", "https://jobs.lever.co/acme/abc?utm_source=x")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isOk());

        verify(applicationService).findByCanonicalUrl(
                user.getId(), "https://jobs.lever.co/acme/abc?utm_source=x");
    }
}
