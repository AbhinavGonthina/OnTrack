package com.ontrack.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ontrack.backend.config.SecurityConfig;
import com.ontrack.backend.dto.ExtractJobRequest;
import com.ontrack.backend.dto.ExtractJobResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.exception.GeminiRateLimitExceededException;
import com.ontrack.backend.repository.UserRepository;
import com.ontrack.backend.security.JwtService;
import com.ontrack.backend.service.JobExtractionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ExtensionController.class)
@Import(SecurityConfig.class)
class ExtensionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    // Constructed rather than injected: @WebMvcTest in Boot 4 does not expose an
    // ObjectMapper bean, and this one only has to serialize a request record.
    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private JobExtractionService jobExtractionService;
    @MockitoBean
    private JwtService jwtService;
    @MockitoBean
    private UserRepository userRepository;

    private Authentication authentication;

    @BeforeEach
    void setUp() {
        User user = User.builder().id(UUID.randomUUID()).email("person@example.com").build();
        authentication = new UsernamePasswordAuthenticationToken(
                user, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    private String json(ExtractJobRequest request) throws Exception {
        return objectMapper.writeValueAsString(request);
    }

    @Test
    void returnsWhatTheServiceRead() throws Exception {
        when(jobExtractionService.extract(any(), any()))
                .thenReturn(new ExtractJobResponse("Acme", "Engineer", "Build things.", "high"));

        mockMvc.perform(post("/api/extension/extract-job")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ExtractJobRequest("https://acme.com/j/1", "Acme", "Page text.")))
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.company").value("Acme"))
                .andExpect(jsonPath("$.role").value("Engineer"))
                .andExpect(jsonPath("$.confidence").value("high"));
    }

    /** This endpoint spends a real Gemini call, so being signed in is the whole gate. */
    @Test
    void requiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/extension/extract-job")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ExtractJobRequest("https://acme.com/j/1", "Acme", "Page text."))))
                .andExpect(status().isForbidden());

        verify(jobExtractionService, never()).extract(any(), any());
    }

    @Test
    void rejectsBlankPageText() throws Exception {
        mockMvc.perform(post("/api/extension/extract-job")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ExtractJobRequest("https://acme.com/j/1", "Acme", "   ")))
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isBadRequest());

        verify(jobExtractionService, never()).extract(any(), any());
    }

    @Test
    void rejectsMissingPageText() throws Exception {
        mockMvc.perform(post("/api/extension/extract-job")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"https://acme.com/j/1\",\"pageTitle\":\"Acme\"}")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isBadRequest());
    }

    /** The extension truncates to 30,000, but the server must not trust it to have done so. */
    @Test
    void rejectsPageTextOverThirtyThousandCharacters() throws Exception {
        mockMvc.perform(post("/api/extension/extract-job")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ExtractJobRequest(
                                "https://acme.com/j/1", "Acme", "x".repeat(30_001))))
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isBadRequest());

        verify(jobExtractionService, never()).extract(any(), any());
    }

    @Test
    void acceptsPageTextExactlyAtTheLimit() throws Exception {
        when(jobExtractionService.extract(any(), any()))
                .thenReturn(new ExtractJobResponse("Acme", "Engineer", "Text.", "low"));

        mockMvc.perform(post("/api/extension/extract-job")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ExtractJobRequest(
                                "https://acme.com/j/1", "Acme", "x".repeat(30_000))))
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isOk());
    }

    @Test
    void rejectsAnOverlongUrl() throws Exception {
        mockMvc.perform(post("/api/extension/extract-job")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ExtractJobRequest(
                                "https://acme.com/" + "x".repeat(2100), "Acme", "Page text.")))
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsAnOverlongPageTitle() throws Exception {
        mockMvc.perform(post("/api/extension/extract-job")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ExtractJobRequest(
                                "https://acme.com/j/1", "x".repeat(501), "Page text.")))
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isBadRequest());
    }

    /** The daily AI budget surfaces as a 429, the same as the other AI features. */
    @Test
    void reportsTheDailyAiLimitAsTooManyRequests() throws Exception {
        when(jobExtractionService.extract(any(), any()))
                .thenThrow(new GeminiRateLimitExceededException());

        mockMvc.perform(post("/api/extension/extract-job")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ExtractJobRequest("https://acme.com/j/1", "Acme", "Page text.")))
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void allowsAMissingUrlAndTitle() throws Exception {
        when(jobExtractionService.extract(any(), any()))
                .thenReturn(new ExtractJobResponse(null, null, null, "low"));

        mockMvc.perform(post("/api/extension/extract-job")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ExtractJobRequest(null, null, "Page text.")))
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isOk());
    }
}
