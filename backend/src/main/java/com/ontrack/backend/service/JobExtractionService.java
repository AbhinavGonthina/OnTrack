package com.ontrack.backend.service;

import com.ontrack.backend.ai.GeminiClient;
import com.ontrack.backend.ai.GeminiJobExtractResult;
import com.ontrack.backend.dto.ExtractJobRequest;
import com.ontrack.backend.dto.ExtractJobResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.exception.GeminiRateLimitExceededException;
import com.ontrack.backend.ratelimit.GeminiRateLimiter;
import org.springframework.stereotype.Service;

import java.util.Set;

/**
 * Reads a job posting off raw page text with Gemini, for the browser extension's fallback
 * when none of its own readers could parse the page.
 *
 * <p>Deliberately not cached, unlike fit analysis. A fit analysis for the same resume and
 * job description is the same answer every time, so caching it saves a call for free. This
 * is different: the user has just been told it will cost one of their daily AI calls and
 * has agreed to spend it, and the page they are looking at may well have changed since
 * last time. Serving a stale answer for a deliberate, consented action would be the wrong
 * trade.
 */
@Service
public class JobExtractionService {

    private final GeminiClient geminiClient;
    private final GeminiRateLimiter geminiRateLimiter;

    /** The values the schema asks for; anything else is not trustworthy enough to pass on. */
    private static final Set<String> VALID_CONFIDENCE = Set.of("high", "medium", "low");

    public JobExtractionService(GeminiClient geminiClient, GeminiRateLimiter geminiRateLimiter) {
        this.geminiClient = geminiClient;
        this.geminiRateLimiter = geminiRateLimiter;
    }

    public ExtractJobResponse extract(User user, ExtractJobRequest request) {
        // Consume before calling, exactly as fit analysis and resume strength do. A failed
        // Gemini call still costs the user a call, which is deliberate: the quota being
        // protected is the shared free-tier one, and that is spent the moment the request
        // leaves, regardless of what comes back.
        if (!geminiRateLimiter.tryConsume(user.getId())) {
            throw new GeminiRateLimitExceededException();
        }

        GeminiJobExtractResult result = geminiClient.extractJobPosting(
                nullToEmpty(request.url()),
                nullToEmpty(request.pageTitle()),
                request.pageText());

        return new ExtractJobResponse(
                blankToNull(result.company()),
                blankToNull(result.role()),
                blankToNull(result.jobDescription()),
                normalizeConfidence(result.confidence()));
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    /**
     * The schema marks every field required, so the model answers "" for anything the page
     * did not state. Turning that into null lets the extension treat it as a missing field
     * and highlight it, rather than quietly saving an empty string.
     */
    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String normalizeConfidence(String value) {
        if (value == null) {
            return "low";
        }
        String lower = value.trim().toLowerCase();
        // An unrecognized value means the model went off-schema, which is itself a reason
        // not to trust the result.
        return VALID_CONFIDENCE.contains(lower) ? lower : "low";
    }
}
