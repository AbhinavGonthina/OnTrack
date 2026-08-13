package com.ontrack.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ontrack.backend.dto.AuthResponse;
import com.ontrack.backend.dto.LoginRequest;
import com.ontrack.backend.dto.SignupRequest;
import com.ontrack.backend.exception.EmailAlreadyExistsException;
import com.ontrack.backend.exception.InvalidCredentialsException;
import com.ontrack.backend.repository.UserRepository;
import com.ontrack.backend.security.JwtService;
import com.ontrack.backend.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false) // security is exercised via manual/live testing, not this HTTP-layer slice
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private AuthService authService;

    // Not used directly (security filters are disabled above), but required so
    // SecurityConfig's filter chain bean can be constructed in this test slice.
    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void signupWithValidBodyReturns201AndToken() throws Exception {
        AuthResponse response = new AuthResponse("fake-jwt", UUID.randomUUID(), "person@example.com");
        when(authService.signup(any(SignupRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/auth/signup")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new SignupRequest("person@example.com", "password123"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("fake-jwt"))
                .andExpect(jsonPath("$.email").value("person@example.com"));
    }

    @Test
    void signupWithInvalidEmailReturns400() throws Exception {
        mockMvc.perform(post("/api/auth/signup")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new SignupRequest("not-an-email", "password123"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void signupWithShortPasswordReturns400() throws Exception {
        mockMvc.perform(post("/api/auth/signup")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new SignupRequest("person@example.com", "short"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void signupWithDuplicateEmailReturns409() throws Exception {
        when(authService.signup(any(SignupRequest.class)))
                .thenThrow(new EmailAlreadyExistsException("person@example.com"));

        mockMvc.perform(post("/api/auth/signup")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new SignupRequest("person@example.com", "password123"))))
                .andExpect(status().isConflict());
    }

    @Test
    void loginWithValidBodyReturns200AndToken() throws Exception {
        AuthResponse response = new AuthResponse("fake-jwt", UUID.randomUUID(), "person@example.com");
        when(authService.login(any(LoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new LoginRequest("person@example.com", "password123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("fake-jwt"));
    }

    @Test
    void loginWithBadCredentialsReturns401() throws Exception {
        when(authService.login(any(LoginRequest.class))).thenThrow(new InvalidCredentialsException());

        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new LoginRequest("person@example.com", "wrong"))))
                .andExpect(status().isUnauthorized());
    }
}
