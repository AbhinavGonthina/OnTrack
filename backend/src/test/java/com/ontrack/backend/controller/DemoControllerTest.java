package com.ontrack.backend.controller;

import com.ontrack.backend.config.SecurityConfig;
import com.ontrack.backend.dto.ApplicationResponse;
import com.ontrack.backend.dto.FitAnalysisResponse;
import com.ontrack.backend.dto.StatsResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.enums.ApplicationStatus;
import com.ontrack.backend.repository.UserRepository;
import com.ontrack.backend.security.JwtService;
import com.ontrack.backend.service.ApplicationService;
import com.ontrack.backend.service.FitAnalysisService;
import com.ontrack.backend.service.StatsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DemoController.class)
@Import(SecurityConfig.class)
class DemoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private ApplicationService applicationService;

    @MockitoBean
    private FitAnalysisService fitAnalysisService;

    @MockitoBean
    private StatsService statsService;

    @MockitoBean
    private JwtService jwtService;

    private User demoUser;

    @BeforeEach
    void setUp() {
        demoUser = User.builder().id(UUID.randomUUID()).email("demo@ontrack.app").build();
        when(userRepository.findByEmail("demo@ontrack.app")).thenReturn(Optional.of(demoUser));
    }

    @Test
    void listApplicationsWorksWithoutAuthentication() throws Exception {
        ApplicationResponse response = new ApplicationResponse(
                UUID.randomUUID(), "Nebula Systems", "SWE Intern", "JD", LocalDate.now(),
                ApplicationStatus.REJECTED, null, null);
        when(applicationService.listForUser(demoUser.getId())).thenReturn(List.of(response));

        mockMvc.perform(get("/api/demo/applications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].company").value("Nebula Systems"));
    }

    @Test
    void fitAnalysisWorksWithoutAuthentication() throws Exception {
        UUID appId = UUID.randomUUID();
        FitAnalysisResponse response = new FitAnalysisResponse(
                UUID.randomUUID(), 88, List.of("ML Systems"), List.of("Great match"), null, true);
        when(fitAnalysisService.getOrCreate(eq(demoUser), eq(appId))).thenReturn(response);

        mockMvc.perform(get("/api/demo/applications/" + appId + "/fit-analysis"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cached").value(true));
    }

    @Test
    void statsWorksWithoutAuthentication() throws Exception {
        StatsResponse response = new StatsResponse(12, 83.3, 58.3, 25.0, 8.3, 9.7, List.of());
        when(statsService.computeStats(demoUser.getId())).thenReturn(response);

        mockMvc.perform(get("/api/demo/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalApplications").value(12));
    }

    @Test
    void createReturns403WithFriendlyMessage() throws Exception {
        mockMvc.perform(post("/api/demo/applications").contentType("application/json").content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("read-only")));
    }

    @Test
    void updateReturns403() throws Exception {
        mockMvc.perform(put("/api/demo/applications/" + UUID.randomUUID()).contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteReturns403() throws Exception {
        mockMvc.perform(delete("/api/demo/applications/" + UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    @Test
    void addStatusEventReturns403() throws Exception {
        mockMvc.perform(post("/api/demo/applications/" + UUID.randomUUID() + "/status").contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void addNoteReturns403() throws Exception {
        mockMvc.perform(post("/api/demo/applications/" + UUID.randomUUID() + "/notes").contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteNoteReturns403() throws Exception {
        mockMvc.perform(delete("/api/demo/notes/" + UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }
}
