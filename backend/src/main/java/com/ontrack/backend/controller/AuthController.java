package com.ontrack.backend.controller;

import com.ontrack.backend.dto.AuthResponse;
import com.ontrack.backend.dto.ForgotPasswordRequest;
import com.ontrack.backend.dto.LoginRequest;
import com.ontrack.backend.dto.MessageResponse;
import com.ontrack.backend.dto.ResendVerificationRequest;
import com.ontrack.backend.dto.ResetPasswordRequest;
import com.ontrack.backend.dto.SignupRequest;
import com.ontrack.backend.dto.VerifyEmailRequest;
import com.ontrack.backend.security.SessionCookie;
import com.ontrack.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final long jwtExpirationMs;

    public AuthController(AuthService authService, @Value("${app.jwt.expiration-ms}") long jwtExpirationMs) {
        this.authService = authService;
        this.jwtExpirationMs = jwtExpirationMs;
    }

    @PostMapping("/signup")
    public ResponseEntity<MessageResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.signup(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, SessionCookie.issue(response.token(), jwtExpirationMs).toString())
                .body(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, SessionCookie.clear().toString())
                .build();
    }

    @PostMapping("/verify-email")
    public ResponseEntity<MessageResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return ResponseEntity.ok(authService.verifyEmail(request.token()));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<MessageResponse> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        return ResponseEntity.ok(authService.resendVerification(request.email()));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return ResponseEntity.ok(authService.forgotPassword(request.email()));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return ResponseEntity.ok(authService.resetPassword(request.token(), request.newPassword()));
    }
}
