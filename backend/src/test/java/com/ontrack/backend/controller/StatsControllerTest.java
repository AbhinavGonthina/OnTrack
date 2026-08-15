package com.ontrack.backend.controller;

import com.ontrack.backend.config.SecurityConfig;
import com.ontrack.backend.dto.SankeyLink;
import com.ontrack.backend.dto.StatsResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.repository.UserRepository;
import com.ontrack.backend.security.JwtService;
import com.ontrack.backend.service.StatsService;
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

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(StatsController.class)
@Import(SecurityConfig.class)
class StatsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StatsService statsService;

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
    void statsReturnsComputedResponse() throws Exception {
        StatsResponse response = new StatsResponse(
                12, 83.3, 58.3, 25.0, 8.3, 9.7,
                List.of(new SankeyLink("APPLIED", "OA", 7)));
        when(statsService.computeStats(user.getId())).thenReturn(response);

        mockMvc.perform(get("/api/stats")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalApplications").value(12))
                .andExpect(jsonPath("$.responseRate").value(83.3))
                .andExpect(jsonPath("$.sankeyLinks[0].source").value("APPLIED"));
    }

    @Test
    void statsRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/stats"))
                .andExpect(status().isForbidden());
    }
}
