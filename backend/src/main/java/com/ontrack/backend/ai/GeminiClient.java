package com.ontrack.backend.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

/**
 * Server-side-only Gemini client — the API key never reaches the frontend,
 * every call is proxied through this class from FitAnalysisService.
 */
@Component
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    // Built from plain Map/List literals rather than a parsed JsonNode - a
    // JsonNode value nested inside a generic Map<String,Object> body gets
    // bean-serialized (reflected over its isXxx()/getXxx() methods) instead
    // of tree-serialized by RestClient's default message converter, since
    // this client's RestClient.Builder has none of Boot's Jackson
    // customization wired in. Plain collections avoid that ambiguity entirely.
    private static final Map<String, Object> RESPONSE_SCHEMA = Map.of(
            "type", "OBJECT",
            "properties", Map.of(
                    "fitScore", Map.of("type", "INTEGER"),
                    "missingKeywords", Map.of("type", "ARRAY", "items", Map.of("type", "STRING")),
                    "suggestedBullets", Map.of("type", "ARRAY", "items", Map.of("type", "STRING"))
            ),
            "required", List.of("fitScore", "missingKeywords", "suggestedBullets")
    );

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;

    public GeminiClient(
            @Value("${app.gemini.api-key}") String apiKey,
            @Value("${app.gemini.model}") String model,
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.model = model;
        this.objectMapper = objectMapper;
        this.restClient = restClientBuilder
                .baseUrl("https://generativelanguage.googleapis.com/v1beta")
                .build();
    }

    public GeminiFitResult analyzeFit(String resumeText, String jobDescriptionText) {
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", buildPrompt(resumeText, jobDescriptionText))))),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "responseSchema", RESPONSE_SCHEMA
                )
        );

        GeminiResponse response;
        try {
            response = restClient.post()
                    .uri("/models/{model}:generateContent?key={key}", model, apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(GeminiResponse.class);
        } catch (RestClientException e) {
            log.warn("Gemini API call failed: {}", e.getMessage());
            throw new GeminiApiException("Gemini API call failed: " + e.getMessage(), e);
        }

        if (response == null || response.candidates() == null || response.candidates().isEmpty()) {
            throw new GeminiApiException("Gemini returned no candidates");
        }

        String json = response.candidates().get(0).content().parts().get(0).text();
        try {
            return objectMapper.readValue(json, GeminiFitResult.class);
        } catch (JsonProcessingException e) {
            throw new GeminiApiException("Failed to parse Gemini response as JSON: " + e.getMessage(), e);
        }
    }

    private String buildPrompt(String resumeText, String jobDescriptionText) {
        return """
                You are a technical resume reviewer helping a software engineering candidate \
                evaluate how well their resume matches a job description.

                Respond ONLY with JSON matching the required schema:
                - fitScore: an integer from 0 to 100 estimating how well the resume matches the job description.
                - missingKeywords: up to 8 important skills, tools, or qualifications from the job description \
                that are missing or weak in the resume.
                - suggestedBullets: 2 to 3 rewritten resume bullet points, grounded in the candidate's actual \
                experience, that would better align with this job description.

                RESUME:
                %s

                JOB DESCRIPTION:
                %s
                """.formatted(resumeText, jobDescriptionText);
    }
}
