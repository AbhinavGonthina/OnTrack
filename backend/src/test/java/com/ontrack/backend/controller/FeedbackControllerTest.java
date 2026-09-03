package com.ontrack.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ontrack.backend.dto.FeedbackRequest;
import com.ontrack.backend.dto.MessageResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.repository.UserRepository;
import com.ontrack.backend.security.JwtService;
import com.ontrack.backend.service.FeedbackService;
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

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FeedbackController.class)
class FeedbackControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private FeedbackService feedbackService;

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
    void submitReturnsConfirmationMessage() throws Exception {
        when(feedbackService.submit(eq(user), any(FeedbackRequest.class)))
                .thenReturn(new MessageResponse("Thanks for the feedback!"));

        String body = objectMapper.writeValueAsString(new FeedbackRequest("Something's broken", "/dashboard"));

        mockMvc.perform(post("/api/feedback")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Thanks for the feedback!"));
    }

    @Test
    void submitWithBlankMessageReturns400() throws Exception {
        String body = objectMapper.writeValueAsString(new FeedbackRequest("", "/dashboard"));

        mockMvc.perform(post("/api/feedback")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication))
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isBadRequest());
    }
}
