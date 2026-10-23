package com.ontrack.backend.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.http.HttpMethod.POST;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Parsing tests for the browser extension's AI fallback. No live Gemini: every response
 * here is a canned one, so the shared free-tier quota is never touched by the suite.
 */
class GeminiJobExtractTest {

    private static final String ENDPOINT =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=fake-api-key";

    private MockRestServiceServer mockServer;
    private GeminiClient geminiClient;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        geminiClient = new GeminiClient("fake-api-key", "gemini-2.5-flash", builder, new ObjectMapper());
    }

    private void respondWith(String innerJson) {
        String body = """
                {
                  "candidates": [{
                    "content": {
                      "parts": [{"text": "%s"}]
                    }
                  }]
                }
                """.formatted(innerJson);
        mockServer.expect(requestTo(ENDPOINT))
                .andExpect(method(POST))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
    }

    @Test
    void parsesAnExtractedPosting() {
        respondWith("{\\\"company\\\":\\\"Acme\\\",\\\"role\\\":\\\"Staff Engineer\\\","
                + "\\\"jobDescription\\\":\\\"Build things.\\\",\\\"confidence\\\":\\\"high\\\"}");

        GeminiJobExtractResult result =
                geminiClient.extractJobPosting("https://acme.com/j/1", "Acme careers", "page text");

        assertThat(result.company()).isEqualTo("Acme");
        assertThat(result.role()).isEqualTo("Staff Engineer");
        assertThat(result.jobDescription()).isEqualTo("Build things.");
        assertThat(result.confidence()).isEqualTo("high");
        mockServer.verify();
    }

    /**
     * The prompt tells the model to answer with an empty string rather than guess, so the
     * empty case has to survive parsing intact for the service to turn it into null.
     */
    @Test
    void parsesEmptyStringsForFieldsThePageDidNotState() {
        respondWith("{\\\"company\\\":\\\"\\\",\\\"role\\\":\\\"Engineer\\\","
                + "\\\"jobDescription\\\":\\\"Some text.\\\",\\\"confidence\\\":\\\"low\\\"}");

        GeminiJobExtractResult result =
                geminiClient.extractJobPosting("https://acme.com/j/1", "", "page text");

        assertThat(result.company()).isEmpty();
        assertThat(result.role()).isEqualTo("Engineer");
    }

    @Test
    void parsesADescriptionContainingNewlinesAndBullets() {
        respondWith("{\\\"company\\\":\\\"Acme\\\",\\\"role\\\":\\\"Engineer\\\","
                + "\\\"jobDescription\\\":\\\"You will:\\\\n- Ship code\\\\n- Review code\\\","
                + "\\\"confidence\\\":\\\"medium\\\"}");

        GeminiJobExtractResult result =
                geminiClient.extractJobPosting("https://acme.com/j/1", "Acme", "page text");

        assertThat(result.jobDescription()).isEqualTo("You will:\n- Ship code\n- Review code");
    }

    @Test
    void throwsGeminiApiExceptionOnServerError() {
        mockServer.expect(requestTo(ENDPOINT)).andExpect(method(POST)).andRespond(withServerError());

        assertThatThrownBy(() ->
                geminiClient.extractJobPosting("https://acme.com/j/1", "Acme", "page text"))
                .isInstanceOf(GeminiApiException.class);
    }

    @Test
    void throwsGeminiApiExceptionWhenTheModelReturnsUnparseableJson() {
        respondWith("not json at all");

        assertThatThrownBy(() ->
                geminiClient.extractJobPosting("https://acme.com/j/1", "Acme", "page text"))
                .isInstanceOf(GeminiApiException.class);
    }

    @Test
    void throwsGeminiApiExceptionWhenThereAreNoCandidates() {
        mockServer.expect(requestTo(ENDPOINT))
                .andExpect(method(POST))
                .andRespond(withSuccess("{\"candidates\":[]}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() ->
                geminiClient.extractJobPosting("https://acme.com/j/1", "Acme", "page text"))
                .isInstanceOf(GeminiApiException.class);
    }
}
