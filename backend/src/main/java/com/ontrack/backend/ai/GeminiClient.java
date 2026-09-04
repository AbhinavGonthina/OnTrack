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
 * every call is proxied through this class from FitAnalysisService/ResumeAnalysisService.
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
    private static final Map<String, Object> FIT_SCHEMA = Map.of(
            "type", "OBJECT",
            "properties", Map.of(
                    "fitScore", Map.of("type", "INTEGER"),
                    "missingKeywords", Map.of("type", "ARRAY", "items", Map.of("type", "STRING")),
                    "suggestedBullets", Map.of("type", "ARRAY", "items", Map.of("type", "STRING"))
            ),
            "required", List.of("fitScore", "missingKeywords", "suggestedBullets")
    );

    private static final Map<String, Object> NORMALIZE_SCHEMA = Map.of(
            "type", "OBJECT",
            "properties", Map.of("normalizedText", Map.of("type", "STRING")),
            "required", List.of("normalizedText")
    );

    private static final Map<String, Object> STRENGTH_SCHEMA = Map.of(
            "type", "OBJECT",
            "properties", Map.of(
                    "score", Map.of("type", "INTEGER"),
                    "categories", Map.of(
                            "type", "ARRAY",
                            "items", Map.of(
                                    "type", "OBJECT",
                                    "properties", Map.of(
                                            "name", Map.of("type", "STRING"),
                                            "score", Map.of("type", "INTEGER"),
                                            "feedback", Map.of("type", "STRING")
                                    ),
                                    "required", List.of("name", "score", "feedback")
                            )
                    ),
                    "recommendations", Map.of("type", "ARRAY", "items", Map.of("type", "STRING"))
            ),
            "required", List.of("score", "categories", "recommendations")
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
        return call(buildFitPrompt(resumeText, jobDescriptionText), FIT_SCHEMA, GeminiFitResult.class);
    }

    public GeminiNormalizeResult normalizeResume(String rawText) {
        return call(buildNormalizePrompt(rawText), NORMALIZE_SCHEMA, GeminiNormalizeResult.class);
    }

    public GeminiStrengthResult scoreResumeStrength(String resumeText) {
        return call(buildStrengthPrompt(resumeText), STRENGTH_SCHEMA, GeminiStrengthResult.class);
    }

    private <T> T call(String prompt, Map<String, Object> responseSchema, Class<T> resultType) {
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "responseSchema", responseSchema
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
            return objectMapper.readValue(json, resultType);
        } catch (JsonProcessingException e) {
            throw new GeminiApiException("Failed to parse Gemini response as JSON: " + e.getMessage(), e);
        }
    }

    private String buildFitPrompt(String resumeText, String jobDescriptionText) {
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

    private String buildNormalizePrompt(String rawText) {
        return """
                You are a resume formatting assistant. Clean up the following raw resume text, which was \
                either pasted by hand or extracted from a PDF/DOCX file and may have inconsistent line \
                breaks, spacing, or run-together words from that extraction.

                Rules:
                - Preserve all factual content (companies, dates, bullet content, skills) - never invent or \
                remove information.
                - Organize into standard resume sections using markdown headers (## Experience, ## Education, \
                ## Skills, ## Projects, etc.) based on what's actually present in the input.
                - Format each bullet point on its own line starting with "- ".
                - Fix obvious extraction artifacts (broken words, duplicated whitespace) without changing wording.

                Respond ONLY with JSON matching the required schema:
                - normalizedText: the cleaned, reformatted resume text as a single markdown string.

                RAW RESUME TEXT:
                %s
                """.formatted(rawText);
    }

    private String buildStrengthPrompt(String resumeText) {
        return """
                You are a resume reviewer specializing in software engineering / CS resumes (internship, \
                new-grad, and experienced SWE candidates). Analyze the following resume text.

                Respond ONLY with JSON matching the required schema:
                - score: an overall integer from 0 to 100.
                - categories: exactly these 4 categories, in this exact order, each with its own 0-100 score \
                and one sentence of specific feedback grounded in what's actually in the resume:
                  1. "Impact & Metrics" - are achievements quantified (numbers, percentages, scale, users, \
                  latency, etc.) rather than just listing responsibilities?
                  2. "Technical Depth" - does the resume show technical depth appropriate for a software \
                  engineering role: relevant languages/frameworks, project or system complexity, and (for \
                  students) relevant CS coursework or fundamentals?
                  3. "Structure & ATS Compatibility" - standard, clearly labeled sections (Experience, \
                  Education, Skills, Projects) in a format both an ATS parser and a human skimmer can follow.
                  4. "Clarity & Conciseness" - strong action verbs, no filler or passive phrasing, bullets \
                  that are specific but not bloated.
                - recommendations: exactly 2 to 3 short, specific, actionable suggestions grounded in \
                software-engineering resume norms - e.g. surfacing a GitHub/portfolio link, adding a concrete \
                metric to a vague bullet, naming a specific missing but relevant technology, or (for \
                students/early-career candidates) highlighting relevant coursework, personal projects, or \
                open-source contributions.

                RESUME:
                %s
                """.formatted(resumeText);
    }
}
