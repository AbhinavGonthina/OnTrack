package com.ontrack.backend.email;

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
 * Server-side-only Resend client - the API key never reaches the frontend,
 * every call is proxied through this class from EmailService.
 */
@Component
public class ResendClient {

    private static final Logger log = LoggerFactory.getLogger(ResendClient.class);

    private final RestClient restClient;
    private final String fromAddress;

    public ResendClient(
            @Value("${app.resend.api-key}") String apiKey,
            @Value("${app.resend.from-address}") String fromAddress,
            RestClient.Builder restClientBuilder) {
        this.fromAddress = fromAddress;
        this.restClient = restClientBuilder
                .baseUrl("https://api.resend.com")
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
    }

    public void send(String toEmail, String subject, String text) {
        Map<String, Object> requestBody = Map.of(
                "from", fromAddress,
                "to", List.of(toEmail),
                "subject", subject,
                "text", text
        );

        try {
            restClient.post()
                    .uri("/emails")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            log.warn("Resend API call failed: {}", e.getMessage());
            throw new EmailDeliveryException("Failed to send email: " + e.getMessage(), e);
        }
    }
}
