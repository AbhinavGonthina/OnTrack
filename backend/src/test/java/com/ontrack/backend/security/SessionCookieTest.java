package com.ontrack.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

import static org.assertj.core.api.Assertions.assertThat;

class SessionCookieTest {

    @Test
    void isHostOnlyAndSameSiteNoneWhenNoDomainIsConfigured() {
        ResponseCookie cookie = SessionCookie.issue("jwt", 86_400_000L, "");

        assertThat(cookie.getDomain()).isNull();
        // Cross-site needs None to be sent at all, which is the pre-existing behaviour and what
        // localhost relies on.
        assertThat(cookie.getSameSite()).isEqualTo("None");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.isSecure()).isTrue();
    }

    // The whole point of coupling the two: a first-party cookie does not need None, and Lax
    // survives browsers removing third-party cookies. Mobile Safari blocks None outright, which
    // is why a refresh signed users out on a phone.
    @Test
    void becomesDomainScopedAndSameSiteLaxOnceADomainIsConfigured() {
        ResponseCookie cookie = SessionCookie.issue("jwt", 86_400_000L, ".abhinavgonthina.me");

        assertThat(cookie.getDomain()).isEqualTo(".abhinavgonthina.me");
        assertThat(cookie.getSameSite()).isEqualTo("Lax");
    }

    // Clearing has to carry the identical domain and SameSite, or the browser treats it as a
    // different cookie and leaves the original in place, so logout would not actually log out.
    @Test
    void clearMirrorsTheIssuedCookieAttributesAndExpiresImmediately() {
        ResponseCookie issued = SessionCookie.issue("jwt", 86_400_000L, ".abhinavgonthina.me");
        ResponseCookie cleared = SessionCookie.clear(".abhinavgonthina.me");

        assertThat(cleared.getName()).isEqualTo(issued.getName());
        assertThat(cleared.getDomain()).isEqualTo(issued.getDomain());
        assertThat(cleared.getSameSite()).isEqualTo(issued.getSameSite());
        assertThat(cleared.getPath()).isEqualTo(issued.getPath());
        assertThat(cleared.getMaxAge()).isZero();
        assertThat(cleared.getValue()).isEmpty();
    }

    @Test
    void treatsABlankDomainTheSameAsNone() {
        assertThat(SessionCookie.issue("jwt", 1L, "   ").getDomain()).isNull();
        assertThat(SessionCookie.issue("jwt", 1L, null).getDomain()).isNull();
    }
}
