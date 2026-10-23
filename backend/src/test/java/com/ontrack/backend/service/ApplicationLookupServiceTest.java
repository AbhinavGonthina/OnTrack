package com.ontrack.backend.service;

import com.ontrack.backend.dto.ApplicationResponse;
import com.ontrack.backend.entity.Application;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.enums.ApplicationStatus;
import com.ontrack.backend.repository.ApplicationRepository;
import com.ontrack.backend.repository.NoteRepository;
import com.ontrack.backend.repository.StatusEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * The duplicate check behind GET /api/applications/lookup. The point of these is that the
 * same posting reached by a different route still counts as the same posting.
 */
@ExtendWith(MockitoExtension.class)
class ApplicationLookupServiceTest {

    @Mock
    private ApplicationRepository applicationRepository;
    @Mock
    private StatusEventRepository statusEventRepository;
    @Mock
    private NoteRepository noteRepository;

    private ApplicationService applicationService;
    private User user;

    @BeforeEach
    void setUp() {
        applicationService = new ApplicationService(
                applicationRepository, statusEventRepository, noteRepository);
        user = User.builder().id(UUID.randomUUID()).email("person@example.com").build();
    }

    private Application stored(String url, Instant createdAt) {
        return Application.builder()
                .id(UUID.randomUUID())
                .user(user)
                .company("Acme")
                .role("Engineer")
                .applicationUrl(url)
                .dateApplied(LocalDate.of(2026, 10, 1))
                .currentStatus(ApplicationStatus.APPLIED)
                .createdAt(createdAt)
                .updatedAt(createdAt)
                .build();
    }

    @Test
    void findsAnExactMatch() {
        when(applicationRepository.findByUserId(user.getId()))
                .thenReturn(List.of(stored("https://jobs.lever.co/acme/abc", Instant.now())));

        Optional<ApplicationResponse> match =
                applicationService.findByCanonicalUrl(user.getId(), "https://jobs.lever.co/acme/abc");

        assertThat(match).isPresent();
        assertThat(match.get().company()).isEqualTo("Acme");
    }

    @Test
    void ignoresTrackingParametersOnTheIncomingLink() {
        when(applicationRepository.findByUserId(user.getId()))
                .thenReturn(List.of(stored("https://jobs.lever.co/acme/abc", Instant.now())));

        assertThat(applicationService.findByCanonicalUrl(
                user.getId(), "https://jobs.lever.co/acme/abc?utm_source=linkedin&gclid=x"))
                .isPresent();
    }

    @Test
    void ignoresTrackingParametersOnTheStoredLink() {
        when(applicationRepository.findByUserId(user.getId()))
                .thenReturn(List.of(stored(
                        "https://jobs.lever.co/acme/abc?lever-source=Indeed", Instant.now())));

        assertThat(applicationService.findByCanonicalUrl(
                user.getId(), "https://jobs.lever.co/acme/abc"))
                .isPresent();
    }

    /** Saving from the page you land on after applying must still find the posting. */
    @Test
    void matchesTheThanksPageAgainstTheStoredPosting() {
        when(applicationRepository.findByUserId(user.getId()))
                .thenReturn(List.of(stored("https://jobs.lever.co/acme/abc", Instant.now())));

        assertThat(applicationService.findByCanonicalUrl(
                user.getId(), "https://jobs.lever.co/acme/abc/thanks"))
                .isPresent();
    }

    @Test
    void matchesALinkedInSearchResultAgainstTheStoredJobView() {
        when(applicationRepository.findByUserId(user.getId()))
                .thenReturn(List.of(stored(
                        "https://www.linkedin.com/jobs/view/3912345678/", Instant.now())));

        assertThat(applicationService.findByCanonicalUrl(
                user.getId(), "https://www.linkedin.com/jobs/search/?currentJobId=3912345678"))
                .isPresent();
    }

    @Test
    void doesNotMatchADifferentPosting() {
        when(applicationRepository.findByUserId(user.getId()))
                .thenReturn(List.of(stored("https://jobs.lever.co/acme/abc", Instant.now())));

        assertThat(applicationService.findByCanonicalUrl(
                user.getId(), "https://jobs.lever.co/acme/different"))
                .isEmpty();
    }

    @Test
    void returnsEmptyWhenTheUserHasNoApplications() {
        when(applicationRepository.findByUserId(user.getId())).thenReturn(List.of());

        assertThat(applicationService.findByCanonicalUrl(
                user.getId(), "https://jobs.lever.co/acme/abc"))
                .isEmpty();
    }

    @Test
    void skipsApplicationsThatHaveNoLinkStored() {
        when(applicationRepository.findByUserId(user.getId()))
                .thenReturn(List.of(stored(null, Instant.now())));

        assertThat(applicationService.findByCanonicalUrl(
                user.getId(), "https://jobs.lever.co/acme/abc"))
                .isEmpty();
    }

    @Test
    void returnsEmptyForABlankUrlWithoutTouchingTheDatabase() {
        assertThat(applicationService.findByCanonicalUrl(user.getId(), "   ")).isEmpty();
    }

    /** Re-saving should surface the original entry, not whichever copy came later. */
    @Test
    void returnsTheOldestMatchWhenDuplicatesAlreadyExist() {
        Instant older = Instant.parse("2026-10-01T00:00:00Z");
        Instant newer = Instant.parse("2026-10-05T00:00:00Z");

        Application first = stored("https://jobs.lever.co/acme/abc", older);
        Application second = stored("https://jobs.lever.co/acme/abc?utm_source=x", newer);
        when(applicationRepository.findByUserId(user.getId()))
                .thenReturn(List.of(second, first));

        Optional<ApplicationResponse> match =
                applicationService.findByCanonicalUrl(user.getId(), "https://jobs.lever.co/acme/abc");

        assertThat(match).isPresent();
        assertThat(match.get().id()).isEqualTo(first.getId());
    }
}
