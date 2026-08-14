package com.ontrack.backend.controller;

import com.ontrack.backend.dto.ResumeUpdateRequest;
import com.ontrack.backend.dto.UserResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public UserResponse profile(@AuthenticationPrincipal User user) {
        return userService.getProfile(user);
    }

    @PutMapping("/resume")
    public UserResponse updateResume(@AuthenticationPrincipal User user, @Valid @RequestBody ResumeUpdateRequest request) {
        return userService.updateResume(user, request.resumeText());
    }
}
