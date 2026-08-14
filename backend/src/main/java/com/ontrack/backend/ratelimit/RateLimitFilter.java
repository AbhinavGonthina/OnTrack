package com.ontrack.backend.ratelimit;

import com.ontrack.backend.entity.User;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * General-purpose per-user/per-IP rate limit, applied to every request except
 * the health check (which the cold-start UI polls frequently by design).
 * Runs inside the Spring Security chain, after JwtAuthenticationFilter, so it
 * can key on the authenticated user when one is present.
 *
 * The Gemini fit-analysis endpoint has its own, much tighter limit — see
 * {@link GeminiRateLimiter} — but that one only fires on an actual cache
 * miss (a real Gemini API call), so it lives in the service layer rather
 * than here, where every request would count against it regardless of
 * whether it actually cost anything.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final String HEALTH_CHECK_PATH = "/actuator/health";

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final int requestsPerMinute;

    public RateLimitFilter(@Value("${app.ratelimit.requests-per-minute:20}") int requestsPerMinute) {
        this.requestsPerMinute = requestsPerMinute;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        if (HEALTH_CHECK_PATH.equals(request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }

        Bucket bucket = buckets.computeIfAbsent(resolveClientKey(request), key -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            response.setHeader("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
            filterChain.doFilter(request, response);
            return;
        }

        long waitSeconds = Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000);
        String unit = waitSeconds == 1 ? "second" : "seconds";
        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(waitSeconds));
        response.setContentType("application/json");
        response.getWriter().write(
                "{\"status\":429,\"error\":\"Too many requests - please slow down and try again in "
                        + waitSeconds + " " + unit + ".\"}");
    }

    private Bucket newBucket() {
        Bandwidth limit = Bandwidth.classic(requestsPerMinute, Refill.greedy(requestsPerMinute, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    private String resolveClientKey(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return "user:" + user.getId();
        }
        return "ip:" + resolveClientIp(request);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
