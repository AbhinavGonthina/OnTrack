package com.ontrack.backend.email;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.http.HttpMethod.POST;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ResendClientTest {

    private MockRestServiceServer mockServer;
    private ResendClient resendClient;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        resendClient = new ResendClient("fake-api-key", "OnTrack <onboarding@resend.dev>", builder);
    }

    @Test
    void sendsRequestWithExpectedShape() {
        mockServer.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(POST))
                .andExpect(header("Authorization", "Bearer fake-api-key"))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andRespond(withSuccess("{\"id\":\"fake-id\"}", MediaType.APPLICATION_JSON));

        resendClient.send("person@example.com", "Subject", "Body text");

        mockServer.verify();
    }

    @Test
    void throwsEmailDeliveryExceptionOnServerError() {
        mockServer.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(POST))
                .andRespond(withServerError());

        assertThatThrownBy(() -> resendClient.send("person@example.com", "Subject", "Body text"))
                .isInstanceOf(EmailDeliveryException.class);
    }
}
