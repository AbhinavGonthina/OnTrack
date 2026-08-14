package com.ontrack.backend.controller;

import com.ontrack.backend.dto.FitAnalysisResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.exception.ApplicationNotFoundException;
import com.ontrack.backend.exception.MissingFitAnalysisInputException;
import com.ontrack.backend.repository.UserRepository;
import com.ontrack.backend.security.JwtService;
import com.ontrack.backend.service.FitAnalysisService;
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

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FitAnalysisController.class)
class FitAnalysisControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FitAnalysisService fitAnalysisService;

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
    void analyzeReturnsFitAnalysis() throws Exception {
        UUID appId = UUID.randomUUID();
        FitAnalysisResponse response = new FitAnalysisResponse(
                UUID.randomUUID(), 78, List.of("Docker"), List.of("Built scalable APIs"), Instant.now(), false);
        when(fitAnalysisService.getOrCreate(eq(user), eq(appId))).thenReturn(response);

        mockMvc.perform(post("/api/applications/" + appId + "/fit-analysis")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fitScore").value(78))
                .andExpect(jsonPath("$.cached").value(false));
    }

    @Test
    void analyzeReturns404WhenApplicationNotFound() throws Exception {
        UUID appId = UUID.randomUUID();
        when(fitAnalysisService.getOrCreate(eq(user), eq(appId))).thenThrow(new ApplicationNotFoundException(appId));

        mockMvc.perform(post("/api/applications/" + appId + "/fit-analysis")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    void analyzeReturns400WhenResumeMissing() throws Exception {
        UUID appId = UUID.randomUUID();
        when(fitAnalysisService.getOrCreate(eq(user), eq(appId)))
                .thenThrow(new MissingFitAnalysisInputException("Add your resume text first"));

        mockMvc.perform(post("/api/applications/" + appId + "/fit-analysis")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication))
                        .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isBadRequest());
    }
}
