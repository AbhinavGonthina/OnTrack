package com.ontrack.backend.controller;

import com.ontrack.backend.dto.AuthResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.security.JwtService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Not under /api/auth/** (which is permitAll) - this relies on SecurityConfig's default
 * anyRequest().authenticated() so an invalid/missing session (no header, no cookie) is
 * rejected with a 401 before the controller ever runs, same as every other protected endpoint.
 */
@RestController
public class SessionController {

    private final JwtService jwtService;

    public SessionController(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @GetMapping("/api/session")
    public AuthResponse session(@AuthenticationPrincipal User user) {
        String token = jwtService.generateToken(user.getId(), user.getEmail());
        return new AuthResponse(token, user.getId(), user.getEmail());
    }
}
