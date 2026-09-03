package com.ontrack.backend.controller;

import com.ontrack.backend.entity.User;
import com.ontrack.backend.repository.UserRepository;
import com.ontrack.backend.security.JwtService;
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

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SessionController.class)
class SessionControllerTest {

    @Autowired
    private MockMvc mockMvc;

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
    void sessionReturnsAFreshTokenForTheAuthenticatedUser() throws Exception {
        when(jwtService.generateToken(user.getId(), user.getEmail())).thenReturn("fresh-jwt");

        mockMvc.perform(get("/api/session")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("fresh-jwt"))
                .andExpect(jsonPath("$.email").value("person@example.com"));
    }

    @Test
    void sessionWithoutAuthenticationReturns401() throws Exception {
        mockMvc.perform(get("/api/session"))
                .andExpect(status().isUnauthorized());
    }
}
