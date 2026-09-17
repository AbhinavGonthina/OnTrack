package com.ontrack.backend.security;

import org.springframework.http.ResponseCookie;

import java.time.Duration;

/**
 * An httpOnly mirror of the JWT, set on login so a page refresh doesn't lose the session. The
 * token itself still lives only in React state (per SPEC.md's no-browser-storage rule), but JS
 * can never read this cookie either way. {@code secure(true)} works over plain http://localhost
 * in every major browser (a documented "trustworthy origin" exception) and is required for real
 * HTTPS deployments, so one setting covers both without a config flag.
 *
 * <p><b>The domain decides SameSite, deliberately.</b> When the frontend and API sit on different
 * registrable domains (ontrack.abhinavgonthina.me calling ontrack-e5r3.onrender.com) this is a
 * third-party cookie, which needs {@code SameSite=None} to be sent at all and which mobile Safari
 * blocks regardless. That is why a refresh signed you out on a phone but not on desktop Chrome.
 * Serving the API from a sibling subdomain instead makes it first-party, and then
 * {@code SameSite=Lax} is both sufficient and far more durable, since browsers are steadily
 * removing third-party cookies altogether.
 *
 * <p>Coupling the two settings keeps the switchover atomic. A browser rejects a {@code Set-Cookie}
 * whose {@code Domain} the responding host does not belong to, so hardcoding the domain would
 * break sessions everywhere until DNS and the frontend's API URL had both caught up. With the
 * domain unset the cookie behaves exactly as it did before; setting it flips domain and SameSite
 * together, in one env var, at the moment the new host actually exists.
 */
public final class SessionCookie {

    public static final String NAME = "ontrack_session";

    private SessionCookie() {
    }

    public static ResponseCookie issue(String token, long expirationMs, String domain) {
        return base(NAME, token, domain)
                .maxAge(Duration.ofMillis(expirationMs))
                .build();
    }

    public static ResponseCookie clear(String domain) {
        return base(NAME, "", domain)
                .maxAge(Duration.ZERO)
                .build();
    }

    private static ResponseCookie.ResponseCookieBuilder base(String name, String value, String domain) {
        boolean sameSite = domain != null && !domain.isBlank();
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(true)
                .sameSite(sameSite ? "Lax" : "None")
                .path("/");
        // Host-only when unset, which is what localhost and the current onrender.com host need.
        return sameSite ? builder.domain(domain) : builder;
    }
}
