package com.ontrack.backend.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.http.HttpMethod.POST;

class GeminiClientTest {

    private MockRestServiceServer mockServer;
    private GeminiClient geminiClient;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        geminiClient = new GeminiClient("fake-api-key", "gemini-2.5-flash", builder, new ObjectMapper());
    }

    @Test
    void parsesFitScoreAndKeywordsFromGeminiResponse() {
        String geminiJson = """
                {
                  "candidates": [{
                    "content": {
                      "parts": [{"text": "{\\"fitScore\\":85,\\"missingKeywords\\":[\\"Kubernetes\\",\\"gRPC\\"],\\"suggestedBullets\\":[\\"Led backend migration\\"]}"}]
                    }
                  }]
                }
                """;
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=fake-api-key"))
                .andExpect(method(POST))
                .andRespond(withSuccess(geminiJson, MediaType.APPLICATION_JSON));

        GeminiFitResult result = geminiClient.analyzeFit("resume text", "job description text");

        assertThat(result.fitScore()).isEqualTo(85);
        assertThat(result.missingKeywords()).containsExactly("Kubernetes", "gRPC");
        assertThat(result.suggestedBullets()).containsExactly("Led backend migration");
        mockServer.verify();
    }

    @Test
    void throwsGeminiApiExceptionOnServerError() {
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=fake-api-key"))
                .andExpect(method(POST))
                .andRespond(withServerError());

        assertThatThrownBy(() -> geminiClient.analyzeFit("resume", "jd"))
                .isInstanceOf(GeminiApiException.class);
    }

    @Test
    void throwsGeminiApiExceptionWhenNoCandidates() {
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=fake-api-key"))
                .andExpect(method(POST))
                .andRespond(withSuccess("{\"candidates\":[]}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> geminiClient.analyzeFit("resume", "jd"))
                .isInstanceOf(GeminiApiException.class);
    }

    @Test
    void parsesNormalizedTextFromGeminiResponse() {
        String geminiJson = """
                {
                  "candidates": [{
                    "content": {
                      "parts": [{"text": "{\\"normalizedText\\":\\"## Experience\\\\n- Did things\\"}"}]
                    }
                  }]
                }
                """;
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=fake-api-key"))
                .andExpect(method(POST))
                .andRespond(withSuccess(geminiJson, MediaType.APPLICATION_JSON));

        GeminiNormalizeResult result = geminiClient.normalizeResume("messy raw resume text");

        assertThat(result.normalizedText()).isEqualTo("## Experience\n- Did things");
        mockServer.verify();
    }

    @Test
    void parsesStrengthScoreCategoriesAndRecommendationsFromGeminiResponse() {
        String geminiJson = """
                {
                  "candidates": [{
                    "content": {
                      "parts": [{"text": "{\\"score\\":72,\\"categories\\":[{\\"name\\":\\"Impact & Metrics\\",\\"score\\":60,\\"feedback\\":\\"Quantify more bullets.\\"}],\\"recommendations\\":[\\"Add metrics\\",\\"List top skills first\\"]}"}]
                    }
                  }]
                }
                """;
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=fake-api-key"))
                .andExpect(method(POST))
                .andRespond(withSuccess(geminiJson, MediaType.APPLICATION_JSON));

        GeminiStrengthResult result = geminiClient.scoreResumeStrength("resume text");

        assertThat(result.score()).isEqualTo(72);
        assertThat(result.categories()).hasSize(1);
        assertThat(result.categories().get(0).name()).isEqualTo("Impact & Metrics");
        assertThat(result.categories().get(0).score()).isEqualTo(60);
        assertThat(result.categories().get(0).feedback()).isEqualTo("Quantify more bullets.");
        assertThat(result.recommendations()).containsExactly("Add metrics", "List top skills first");
        mockServer.verify();
    }
}
