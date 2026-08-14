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
}
