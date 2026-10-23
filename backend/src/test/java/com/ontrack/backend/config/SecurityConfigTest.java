package com.ontrack.backend.config;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityConfigTest {

    @Test
    void parsesASingleOrigin() {
        assertThat(SecurityConfig.parseAllowedOrigins("http://localhost:3000"))
                .containsExactly("http://localhost:3000");
    }

    @Test
    void splitsOnCommasWithoutSpaces() {
        assertThat(SecurityConfig.parseAllowedOrigins(
                "http://localhost:3000,chrome-extension://abc"))
                .containsExactly("http://localhost:3000", "chrome-extension://abc");
    }

    /**
     * The whole reason this method exists. CORS_ALLOWED_ORIGINS is typed by hand into
     * Render's dashboard, and a space after the comma used to produce an origin of
     * " chrome-extension://abc" that silently matched nothing.
     */
    @Test
    void trimsSurroundingWhitespaceOnEveryEntry() {
        assertThat(SecurityConfig.parseAllowedOrigins(
                "http://localhost:3000, chrome-extension://abc ,\thttps://ontrack.example "))
                .containsExactly(
                        "http://localhost:3000",
                        "chrome-extension://abc",
                        "https://ontrack.example");
    }

    @Test
    void dropsEmptyEntriesFromTrailingOrDoubledCommas() {
        assertThat(SecurityConfig.parseAllowedOrigins(
                "http://localhost:3000,,chrome-extension://abc,"))
                .containsExactly("http://localhost:3000", "chrome-extension://abc");
    }

    @Test
    void returnsNothingForABlankValue() {
        assertThat(SecurityConfig.parseAllowedOrigins("   ")).isEqualTo(List.of());
    }
}
