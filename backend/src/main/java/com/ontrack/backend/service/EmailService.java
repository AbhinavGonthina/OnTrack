package com.ontrack.backend.service;

import com.ontrack.backend.email.ResendClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final ResendClient resendClient;
    private final String frontendUrl;

    public EmailService(ResendClient resendClient, @Value("${app.frontend-url}") String frontendUrl) {
        this.resendClient = resendClient;
        this.frontendUrl = frontendUrl;
    }

    public void sendVerificationEmail(String toEmail, String rawToken) {
        String link = frontendUrl + "/verify-email?token=" + rawToken;
        resendClient.send(
                toEmail,
                "Verify your OnTrack email",
                "Welcome to OnTrack! Confirm your email address by opening this link:\n\n" + link
                        + "\n\nThis link expires in 24 hours. If you didn't sign up for OnTrack, you can ignore this email.");
    }

    public void sendPasswordResetEmail(String toEmail, String rawToken) {
        String link = frontendUrl + "/reset-password?token=" + rawToken;
        resendClient.send(
                toEmail,
                "Reset your OnTrack password",
                "We received a request to reset your OnTrack password. Open this link to choose a new one:\n\n"
                        + link
                        + "\n\nThis link expires in 30 minutes. If you didn't request this, you can ignore this email.");
    }
}
