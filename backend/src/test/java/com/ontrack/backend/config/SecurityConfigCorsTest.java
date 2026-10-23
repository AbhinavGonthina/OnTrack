package com.ontrack.backend.config;

import com.ontrack.backend.controller.SessionController;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.repository.UserRepository;
import com.ontrack.backend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The browser extension calls the API from an Origin of chrome-extension://&lt;id&gt;.
 * Chromium does not enforce CORS for a host-permitted extension request, but Spring's
 * CORS processing still rejects an unknown Origin with 403 "Invalid CORS request" before
 * the controller runs, so the extension's origin genuinely has to be configured.
 */
@WebMvcTest(SessionController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties =
        "app.cors.allowed-origins=http://localhost:3000, chrome-extension://immfkodocchgncopfbmieneelgplgfai")
class SecurityConfigCorsTest {

    private static final String EXTENSION_ORIGIN =
            "chrome-extension://immfkodocchgncopfbmieneelgplgfai";
    private static final String UNKNOWN_EXTENSION_ORIGIN =
            "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    @Autowired
    private MockMvc mockMvc;

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
        when(jwtService.generateToken(user.getId(), user.getEmail())).thenReturn("a-token");
    }

    /**
     * Note the configured value above has a space after the comma. Before the trim this
     * test would fail, which is the regression it exists to catch.
     */
    @Test
    void acceptsTheExtensionOriginEvenThoughItIsConfiguredAfterASpace() throws Exception {
        mockMvc.perform(get("/api/session")
                        .header("Origin", EXTENSION_ORIGIN)
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", EXTENSION_ORIGIN))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
    }

    @Test
    void rejectsAnExtensionOriginThatIsNotConfigured() throws Exception {
        mockMvc.perform(get("/api/session")
                        .header("Origin", UNKNOWN_EXTENSION_ORIGIN)
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isForbidden());
    }

    @Test
    void answersThePreflightForTheExtensionOrigin() throws Exception {
        mockMvc.perform(options("/api/session")
                        .header("Origin", EXTENSION_ORIGIN)
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", EXTENSION_ORIGIN));
    }

    @Test
    void rejectsThePreflightForAnUnconfiguredOrigin() throws Exception {
        mockMvc.perform(options("/api/session")
                        .header("Origin", UNKNOWN_EXTENSION_ORIGIN)
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }

    @Test
    void stillAcceptsTheWebAppOrigin() throws Exception {
        mockMvc.perform(get("/api/session")
                        .header("Origin", "http://localhost:3000")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
    }
}
