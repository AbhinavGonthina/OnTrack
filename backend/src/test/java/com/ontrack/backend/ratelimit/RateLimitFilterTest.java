package com.ontrack.backend.ratelimit;

import com.ontrack.backend.entity.User;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class RateLimitFilterTest {

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void allowsRequestsUnderTheLimit() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(5);
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/applications");
        request.setRemoteAddr("1.2.3.4");

        for (int i = 0; i < 5; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, chain);
            assertThat(response.getStatus()).isEqualTo(200);
        }

        verify(chain, times(5)).doFilter(eq(request), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void rejectsRequestsOverTheLimitWith429() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(2);
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/applications");
        request.setRemoteAddr("5.6.7.8");

        filter.doFilter(request, new MockHttpServletResponse(), chain);
        filter.doFilter(request, new MockHttpServletResponse(), chain);
        MockHttpServletResponse thirdResponse = new MockHttpServletResponse();
        filter.doFilter(request, thirdResponse, chain);

        assertThat(thirdResponse.getStatus()).isEqualTo(429);
        assertThat(thirdResponse.getContentAsString()).contains("Too many requests");
        assertThat(thirdResponse.getHeader("Retry-After")).isNotNull();
    }

    @Test
    void tracksDifferentClientsSeparately() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(1);
        FilterChain chain = mock(FilterChain.class);

        MockHttpServletRequest requestA = new MockHttpServletRequest("GET", "/api/applications");
        requestA.setRemoteAddr("1.1.1.1");
        MockHttpServletResponse responseA = new MockHttpServletResponse();
        filter.doFilter(requestA, responseA, chain);

        MockHttpServletRequest requestB = new MockHttpServletRequest("GET", "/api/applications");
        requestB.setRemoteAddr("2.2.2.2");
        MockHttpServletResponse responseB = new MockHttpServletResponse();
        filter.doFilter(requestB, responseB, chain);

        assertThat(responseA.getStatus()).isEqualTo(200);
        assertThat(responseB.getStatus()).isEqualTo(200);
    }

    @Test
    void keysByAuthenticatedUserRatherThanIp() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(1);
        FilterChain chain = mock(FilterChain.class);
        User user = User.builder().id(UUID.randomUUID()).email("person@example.com").build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, List.of()));

        MockHttpServletRequest firstRequest = new MockHttpServletRequest("GET", "/api/applications");
        firstRequest.setRemoteAddr("1.1.1.1");
        MockHttpServletResponse firstResponse = new MockHttpServletResponse();
        filter.doFilter(firstRequest, firstResponse, chain);

        // Same user, different IP - should still be rate limited together since keyed by user id.
        MockHttpServletRequest secondRequest = new MockHttpServletRequest("GET", "/api/applications");
        secondRequest.setRemoteAddr("9.9.9.9");
        MockHttpServletResponse secondResponse = new MockHttpServletResponse();
        filter.doFilter(secondRequest, secondResponse, chain);

        assertThat(firstResponse.getStatus()).isEqualTo(200);
        assertThat(secondResponse.getStatus()).isEqualTo(429);
    }

    @Test
    void healthCheckIsNeverRateLimited() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(1);
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/actuator/health");
        request.setRemoteAddr("1.2.3.4");

        for (int i = 0; i < 10; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, chain);
            assertThat(response.getStatus()).isEqualTo(200);
        }
    }
}
