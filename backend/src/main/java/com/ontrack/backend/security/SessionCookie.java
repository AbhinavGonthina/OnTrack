package com.ontrack.backend.security;

import org.springframework.http.ResponseCookie;

import java.time.Duration;

/**
 * An httpOnly mirror of the JWT, set on login so a page refresh doesn't lose the session -
 * the token itself still lives only in React state (per SPEC.md's no-browser-storage rule),
 * but JS can never read this cookie either way. {@code secure(true)} works over plain
 * http://localhost in every major browser (a documented "trustworthy origin" exception), and
 * is required for real HTTPS deployments, so one setting covers both without a config flag.
 */
public final class SessionCookie {

    public static final String NAME = "ontrack_session";

    private SessionCookie() {
    }

    public static ResponseCookie issue(String token, long expirationMs) {
        return ResponseCookie.from(NAME, token)
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path("/")
                .maxAge(Duration.ofMillis(expirationMs))
                .build();
    }

    public static ResponseCookie clear() {
        return ResponseCookie.from(NAME, "")
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path("/")
                .maxAge(Duration.ZERO)
                .build();
    }
}
