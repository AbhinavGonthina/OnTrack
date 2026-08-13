package com.ontrack.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

// UserDetailsServiceAutoConfiguration excluded: auth is handled directly in
// AuthService (manual password check + JWT issuance), not via Spring's
// AuthenticationManager/UserDetailsService, so the default in-memory user
// it generates is unused and just noise in the logs.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class OnTrackApplication {

	public static void main(String[] args) {
		SpringApplication.run(OnTrackApplication.class, args);
	}

}
