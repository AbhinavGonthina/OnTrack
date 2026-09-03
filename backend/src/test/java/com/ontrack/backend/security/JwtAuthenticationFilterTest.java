package com.ontrack.backend.security;

import com.ontrack.backend.entity.User;
import com.ontrack.backend.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class JwtAuthenticationFilterTest {

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void authenticatesFromTheAuthorizationHeader() throws Exception {
        JwtService jwtService = mock(JwtService.class);
        UserRepository userRepository = mock(UserRepository.class);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, userRepository);
        User user = User.builder().id(UUID.randomUUID()).email("person@example.com").build();
        when(jwtService.isValid("header-jwt")).thenReturn(true);
        when(jwtService.extractUserId("header-jwt")).thenReturn(user.getId());
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/applications");
        request.addHeader("Authorization", "Bearer header-jwt");
        FilterChain chain = mock(FilterChain.class);

        filter.doFilterInternal(request, new MockHttpServletResponse(), chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal()).isEqualTo(user);
        verify(chain).doFilter(eq(request), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void fallsBackToTheSessionCookieWhenThereIsNoAuthorizationHeader() throws Exception {
        JwtService jwtService = mock(JwtService.class);
        UserRepository userRepository = mock(UserRepository.class);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, userRepository);
        User user = User.builder().id(UUID.randomUUID()).email("person@example.com").build();
        when(jwtService.isValid("cookie-jwt")).thenReturn(true);
        when(jwtService.extractUserId("cookie-jwt")).thenReturn(user.getId());
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/session");
        request.setCookies(new Cookie(SessionCookie.NAME, "cookie-jwt"));

        filter.doFilterInternal(request, new MockHttpServletResponse(), mock(FilterChain.class));

        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal()).isEqualTo(user);
    }

    @Test
    void ignoresAnUnrelatedCookie() throws Exception {
        JwtService jwtService = mock(JwtService.class);
        UserRepository userRepository = mock(UserRepository.class);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, userRepository);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/session");
        request.setCookies(new Cookie("some_other_cookie", "irrelevant"));

        filter.doFilterInternal(request, new MockHttpServletResponse(), mock(FilterChain.class));

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verifyNoInteractions(jwtService);
    }

    @Test
    void leavesTheSecurityContextEmptyWithNoTokenAtAll() throws Exception {
        JwtService jwtService = mock(JwtService.class);
        UserRepository userRepository = mock(UserRepository.class);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, userRepository);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/applications");

        filter.doFilterInternal(request, new MockHttpServletResponse(), mock(FilterChain.class));

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
