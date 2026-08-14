package com.ontrack.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ontrack.backend.dto.ResumeUpdateRequest;
import com.ontrack.backend.dto.UserResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.repository.UserRepository;
import com.ontrack.backend.security.JwtService;
import com.ontrack.backend.service.UserService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private UserService userService;

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
    void profileReturnsCurrentUser() throws Exception {
        UserResponse response = new UserResponse(user.getId(), "person@example.com", "resume text", Instant.now());
        when(userService.getProfile(user)).thenReturn(response);

        mockMvc.perform(get("/api/users/me")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("person@example.com"));
    }

    @Test
    void updateResumeReturnsUpdatedUser() throws Exception {
        UserResponse response = new UserResponse(user.getId(), "person@example.com", "new resume text", Instant.now());
        when(userService.updateResume(eq(user), eq("new resume text"))).thenReturn(response);

        String body = objectMapper.writeValueAsString(new ResumeUpdateRequest("new resume text"));

        mockMvc.perform(put("/api/users/me/resume")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resumeText").value("new resume text"));
    }

    @Test
    void updateResumeWithBlankTextReturns400() throws Exception {
        String body = objectMapper.writeValueAsString(new ResumeUpdateRequest(""));

        mockMvc.perform(put("/api/users/me/resume")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isBadRequest());
    }
}
