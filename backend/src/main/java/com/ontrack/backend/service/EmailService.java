package com.ontrack.backend.service;

import com.ontrack.backend.email.ResendClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final ResendClient resendClient;
    private final String frontendUrl;
    private final String feedbackRecipientEmail;

    public EmailService(
            ResendClient resendClient,
            @Value("${app.frontend-url}") String frontendUrl,
            @Value("${app.feedback.recipient-email}") String feedbackRecipientEmail) {
        this.resendClient = resendClient;
        this.frontendUrl = frontendUrl;
        this.feedbackRecipientEmail = feedbackRecipientEmail;
    }

    public void sendVerificationEmail(String toEmail, String rawToken) {
        String link = frontendUrl + "/verify-email?token=" + rawToken;
        resendClient.send(
                toEmail,
                "Verify your OnTrack email",
                "Welcome to OnTrack! Confirm your email address by opening this link:\n\n" + link
                        + "\n\nThis link expires in 24 hours. If you didn't sign up for OnTrack, you can ignore this email.",
                htmlBody(
                        "Confirm your email",
                        "Welcome to OnTrack. Confirm your email address to activate your account.",
                        "Verify email address",
                        link,
                        "This link expires in 24 hours. If you didn't sign up for OnTrack, you can ignore this email."));
    }

    public void sendPasswordResetEmail(String toEmail, String rawToken) {
        String link = frontendUrl + "/reset-password?token=" + rawToken;
        resendClient.send(
                toEmail,
                "Reset your OnTrack password",
                "We received a request to reset your OnTrack password. Open this link to choose a new one:\n\n"
                        + link
                        + "\n\nThis link expires in 30 minutes. If you didn't request this, you can ignore this email.",
                htmlBody(
                        "Reset your password",
                        "We received a request to reset your OnTrack password. Choose a new one here.",
                        "Choose a new password",
                        link,
                        "This link expires in 30 minutes. If you didn't request this, you can ignore this email."));
    }

    /**
     * Deliberately plain, table-free, inline-styled HTML. Email clients strip &lt;style&gt; blocks
     * and external CSS, so anything not inline won't render. The point of the HTML part is not
     * decoration: a text-only body whose only content is a bare URL is a strong spam signal to
     * Gmail, and real anchor text plus a plain sender footer scores considerably better.
     */
    private String htmlBody(String heading, String intro, String buttonLabel, String link, String footer) {
        return """
                <!doctype html>
                <html>
                  <body style="margin:0;padding:24px;background:#f6f6f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e3;border-radius:12px;padding:32px;">
                      <p style="margin:0 0 24px;font-size:18px;font-weight:700;color:#1a1a19;">OnTrack</p>
                      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1a1a19;">%s</h1>
                      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#57534e;">%s</p>
                      <p style="margin:0 0 24px;">
                        <a href="%s" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 20px;border-radius:8px;">%s</a>
                      </p>
                      <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#78716c;">%s</p>
                      <p style="margin:0;font-size:13px;line-height:1.5;color:#78716c;">If the button doesn't work, paste this into your browser:<br><span style="color:#57534e;word-break:break-all;">%s</span></p>
                    </div>
                  </body>
                </html>
                """
                .formatted(escape(heading), escape(intro), link, escape(buttonLabel), escape(footer), link);
    }

    /** The interpolated strings are all fixed copy today, but escaping keeps that from silently mattering later. */
    private String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    /**
     * The recipient is a fixed address read from config (never sent to or hardcoded in the
     * frontend) so reporters can't see who actually receives these.
     */
    public void sendFeedbackEmail(String reporterEmail, String message, String pageUrl) {
        resendClient.send(
                feedbackRecipientEmail,
                "OnTrack feedback from " + reporterEmail,
                "From: " + reporterEmail + "\nPage: " + pageUrl + "\n\n" + message);
    }
}
