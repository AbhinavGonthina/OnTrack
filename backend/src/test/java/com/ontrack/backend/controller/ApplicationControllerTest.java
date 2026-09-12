package com.ontrack.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ontrack.backend.dto.ApplicationDetailResponse;
import com.ontrack.backend.dto.ApplicationRequest;
import com.ontrack.backend.dto.ApplicationResponse;
import com.ontrack.backend.dto.StatusEventRequest;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.enums.ApplicationStatus;
import com.ontrack.backend.exception.ApplicationNotFoundException;
import com.ontrack.backend.repository.UserRepository;
import com.ontrack.backend.security.JwtService;
import com.ontrack.backend.service.ApplicationService;
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

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ApplicationController.class)
class ApplicationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @MockitoBean
    private ApplicationService applicationService;

    // Not used directly (security filters are disabled above), but required so
    // SecurityConfig's filter chain bean can be constructed in this test slice.
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
    void listReturnsUsersApplications() throws Exception {
        ApplicationResponse response = new ApplicationResponse(
                UUID.randomUUID(), "Acme", "SWE Intern", "JD", LocalDate.now(),
                ApplicationStatus.APPLIED, null, null);
        when(applicationService.listForUser(user.getId())).thenReturn(List.of(response));

        mockMvc.perform(get("/api/applications").with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].company").value("Acme"));
    }

    @Test
    void createWithValidBodyReturns201() throws Exception {
        ApplicationResponse response = new ApplicationResponse(
                UUID.randomUUID(), "Acme", "SWE Intern", "JD", LocalDate.now(),
                ApplicationStatus.APPLIED, null, null);
        when(applicationService.create(eq(user), any(ApplicationRequest.class))).thenReturn(response);

        String body = objectMapper.writeValueAsString(
                new ApplicationRequest("Acme", "SWE Intern", "JD", LocalDate.now()));

        mockMvc.perform(post("/api/applications")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.company").value("Acme"));
    }

    @Test
    void createWithBlankCompanyReturns400() throws Exception {
        String body = objectMapper.writeValueAsString(new ApplicationRequest("", "SWE Intern", "JD", LocalDate.now()));

        mockMvc.perform(post("/api/applications")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void detailReturns404WhenNotFound() throws Exception {
        UUID appId = UUID.randomUUID();
        when(applicationService.getDetail(user.getId(), appId)).thenThrow(new ApplicationNotFoundException(appId));

        mockMvc.perform(get("/api/applications/" + appId)
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isNotFound());
    }

    @Test
    void detailReturnsApplicationWithEventsAndNotes() throws Exception {
        UUID appId = UUID.randomUUID();
        ApplicationDetailResponse detail = new ApplicationDetailResponse(
                appId, "Acme", "SWE Intern", "JD", LocalDate.now(),
                ApplicationStatus.APPLIED, null, null, List.of(), List.of());
        when(applicationService.getDetail(user.getId(), appId)).thenReturn(detail);

        mockMvc.perform(get("/api/applications/" + appId)
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.company").value("Acme"));
    }

    @Test
    void deleteReturns204() throws Exception {
        UUID appId = UUID.randomUUID();

        mockMvc.perform(delete("/api/applications/" + appId)
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    void addStatusEventReturnsUpdatedApplication() throws Exception {
        UUID appId = UUID.randomUUID();
        ApplicationResponse response = new ApplicationResponse(
                appId, "Acme", "SWE Intern", "JD", LocalDate.now(),
                ApplicationStatus.OA, null, null);
        when(applicationService.addStatusEvent(eq(user.getId()), eq(appId), any(StatusEventRequest.class)))
                .thenReturn(response);

        String body = objectMapper.writeValueAsString(
                new StatusEventRequest(ApplicationStatus.OA, null, null, LocalDate.now()));

        mockMvc.perform(post("/api/applications/" + appId + "/status")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentStatus").value("OA"));
    }

    @Test
    void deleteStatusEventReturnsUpdatedApplication() throws Exception {
        UUID appId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        ApplicationResponse response = new ApplicationResponse(
                appId, "Acme", "SWE Intern", "JD", LocalDate.now(),
                ApplicationStatus.OA, null, null);
        when(applicationService.deleteStatusEvent(user.getId(), appId, eventId)).thenReturn(response);

        mockMvc.perform(delete("/api/applications/" + appId + "/status/" + eventId)
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentStatus").value("OA"));
    }
}
