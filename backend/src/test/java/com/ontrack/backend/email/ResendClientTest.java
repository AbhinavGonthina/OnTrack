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
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
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

    // Both parts have to go in the same request. Sending HTML only, or text only, are each worse
    // for inbox placement than sending the two together.
    @Test
    void sendsTextAndHtmlTogetherWhenHtmlIsGiven() {
        mockServer.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(POST))
                .andExpect(jsonPath("$.text").value("Body text"))
                .andExpect(jsonPath("$.html").value("<p>Body html</p>"))
                .andRespond(withSuccess("{\"id\":\"fake-id\"}", MediaType.APPLICATION_JSON));

        resendClient.send("person@example.com", "Subject", "Body text", "<p>Body html</p>");

        mockServer.verify();
    }

    // Resend treats a present-but-null html field differently from an absent one, so the
    // plain-text overload must omit the key rather than send null.
    @Test
    void omitsTheHtmlFieldEntirelyForPlainTextMail() {
        mockServer.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(POST))
                .andExpect(jsonPath("$.text").value("Body text"))
                .andExpect(jsonPath("$.html").doesNotExist())
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
