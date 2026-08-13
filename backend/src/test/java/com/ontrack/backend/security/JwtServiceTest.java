package com.ontrack.backend.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService("a-test-secret-that-is-long-enough-for-hs256", 3600000L);
    }

    @Test
    void generatedTokenIsValidAndCarriesTheUserId() {
        UUID userId = UUID.randomUUID();

        String token = jwtService.generateToken(userId, "person@example.com");

        assertThat(jwtService.isValid(token)).isTrue();
        assertThat(jwtService.extractUserId(token)).isEqualTo(userId);
    }

    @Test
    void garbageTokenIsNotValid() {
        assertThat(jwtService.isValid("not.a.real.jwt")).isFalse();
    }

    @Test
    void tokenSignedWithADifferentSecretIsNotValid() {
        JwtService otherService = new JwtService("a-completely-different-secret-value", 3600000L);
        String token = otherService.generateToken(UUID.randomUUID(), "person@example.com");

        assertThat(jwtService.isValid(token)).isFalse();
    }

    @Test
    void expiredTokenIsNotValid() {
        JwtService shortLivedService = new JwtService("a-test-secret-that-is-long-enough-for-hs256", -1000L);
        String token = shortLivedService.generateToken(UUID.randomUUID(), "person@example.com");

        assertThat(jwtService.isValid(token)).isFalse();
    }
}
