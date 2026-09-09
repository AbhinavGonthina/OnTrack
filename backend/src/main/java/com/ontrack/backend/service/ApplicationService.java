package com.ontrack.backend.service;

import com.ontrack.backend.dto.ApplicationDetailResponse;
import com.ontrack.backend.dto.ApplicationRequest;
import com.ontrack.backend.dto.ApplicationResponse;
import com.ontrack.backend.dto.NoteResponse;
import com.ontrack.backend.dto.StatusEventRequest;
import com.ontrack.backend.dto.StatusEventResponse;
import com.ontrack.backend.entity.Application;
import com.ontrack.backend.entity.Note;
import com.ontrack.backend.entity.StatusEvent;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.enums.ApplicationStatus;
import com.ontrack.backend.exception.ApplicationLimitExceededException;
import com.ontrack.backend.exception.ApplicationNotFoundException;
import com.ontrack.backend.exception.InvalidStatusEventException;
import com.ontrack.backend.exception.StatusEventNotFoundException;
import com.ontrack.backend.repository.ApplicationRepository;
import com.ontrack.backend.repository.NoteRepository;
import com.ontrack.backend.repository.StatusEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class ApplicationService {

    static final int MAX_APPLICATIONS_PER_USER = 100;

    private static final Set<ApplicationStatus> VALID_REJECTED_FROM_STAGES = EnumSet.of(
            ApplicationStatus.APPLIED,
            ApplicationStatus.OA,
            ApplicationStatus.PHONE_SCREEN,
            ApplicationStatus.INTERVIEW
    );

    // A new status event's tier must never be lower than the application's current tier -
    // that's the "never backward" rule. Skipping stages forward is fine (real hiring
    // processes sometimes skip a stage). REJECTED and the two offer-response statuses
    // (ACCEPTED/DECLINED) are handled separately from this generic forward check - see
    // validateStatusEvent - but they're still given a tier here so the date-hierarchy check
    // below (which is generic over every status) has something to compare against.
    private static final Map<ApplicationStatus, Integer> STAGE_TIER = new EnumMap<>(ApplicationStatus.class);

    static {
        STAGE_TIER.put(ApplicationStatus.APPLIED, 0);
        STAGE_TIER.put(ApplicationStatus.OA, 1);
        STAGE_TIER.put(ApplicationStatus.PHONE_SCREEN, 2);
        STAGE_TIER.put(ApplicationStatus.INTERVIEW, 3);
        STAGE_TIER.put(ApplicationStatus.OFFER, 4);
        STAGE_TIER.put(ApplicationStatus.ACCEPTED, 5);
        STAGE_TIER.put(ApplicationStatus.DECLINED, 5);
    }

    private final ApplicationRepository applicationRepository;
    private final StatusEventRepository statusEventRepository;
    private final NoteRepository noteRepository;

    public ApplicationService(
            ApplicationRepository applicationRepository,
            StatusEventRepository statusEventRepository,
            NoteRepository noteRepository) {
        this.applicationRepository = applicationRepository;
        this.statusEventRepository = statusEventRepository;
        this.noteRepository = noteRepository;
    }

    public List<ApplicationResponse> listForUser(UUID userId) {
        return applicationRepository.findByUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ApplicationResponse create(User user, ApplicationRequest request) {
        if (applicationRepository.countByUserId(user.getId()) >= MAX_APPLICATIONS_PER_USER) {
            throw new ApplicationLimitExceededException(MAX_APPLICATIONS_PER_USER);
        }

        Application application = Application.builder()
                .user(user)
                .company(request.company())
                .role(request.role())
                .jobDescriptionText(request.jobDescriptionText())
                .dateApplied(request.dateApplied())
                .currentStatus(ApplicationStatus.APPLIED)
                .build();
        application = applicationRepository.save(application);

        StatusEvent initialEvent = StatusEvent.builder()
                .application(application)
                .status(ApplicationStatus.APPLIED)
                .eventDate(request.dateApplied())
                .build();
        statusEventRepository.save(initialEvent);

        return toResponse(application);
    }

    public ApplicationDetailResponse getDetail(UUID userId, UUID applicationId) {
        Application application = findOwned(userId, applicationId);

        List<StatusEventResponse> events = statusEventRepository
                .findByApplicationIdOrderByEventDateAscCreatedAtAsc(applicationId).stream()
                .map(this::toStatusEventResponse)
                .toList();

        List<NoteResponse> notes = noteRepository
                .findByApplicationIdOrderByCreatedAtDesc(applicationId).stream()
                .map(this::toNoteResponse)
                .toList();

        return new ApplicationDetailResponse(
                application.getId(),
                application.getCompany(),
                application.getRole(),
                application.getJobDescriptionText(),
                application.getDateApplied(),
                application.getCurrentStatus(),
                application.getCreatedAt(),
                application.getUpdatedAt(),
                events,
                notes
        );
    }

    @Transactional
    public ApplicationResponse update(UUID userId, UUID applicationId, ApplicationRequest request) {
        Application application = findOwned(userId, applicationId);
        application.setCompany(request.company());
        application.setRole(request.role());
        application.setJobDescriptionText(request.jobDescriptionText());
        application.setDateApplied(request.dateApplied());
        application = applicationRepository.save(application);
        return toResponse(application);
    }

    @Transactional
    public void delete(UUID userId, UUID applicationId) {
        Application application = findOwned(userId, applicationId);
        applicationRepository.delete(application);
    }

    @Transactional
    public ApplicationResponse addStatusEvent(UUID userId, UUID applicationId, StatusEventRequest request) {
        Application application = findOwned(userId, applicationId);
        validateStatusEvent(application, request);

        Integer interviewRound = null;
        if (request.status() == ApplicationStatus.INTERVIEW) {
            interviewRound = (int) statusEventRepository.countByApplicationIdAndStatus(
                    application.getId(), ApplicationStatus.INTERVIEW) + 1;
        }

        StatusEvent event = StatusEvent.builder()
                .application(application)
                .status(request.status())
                .rejectedFromStage(request.rejectedFromStage())
                .interviewRound(interviewRound)
                .interviewType(request.interviewType())
                .interviewFormat(request.interviewFormat())
                .eventDate(request.eventDate())
                .build();
        statusEventRepository.save(event);

        application.setCurrentStatus(request.status());
        application = applicationRepository.save(application);

        return toResponse(application);
    }

    @Transactional
    public ApplicationResponse deleteStatusEvent(UUID userId, UUID applicationId, UUID eventId) {
        Application application = findOwned(userId, applicationId);
        StatusEvent event = statusEventRepository.findByIdAndApplicationId(eventId, applicationId)
                .orElseThrow(() -> new StatusEventNotFoundException(eventId));

        if (event.getStatus() == ApplicationStatus.APPLIED) {
            throw new InvalidStatusEventException(
                    "The Applied stage can't be deleted. Edit the application's date applied instead.");
        }

        statusEventRepository.delete(event);

        // Interview rounds are numbered by counting existing INTERVIEW events, so a gap left
        // behind by a deleted round (e.g. only rounds 1 and 3 remain) would make the next
        // added round collide with round 3. Renumbering keeps them contiguous.
        if (event.getStatus() == ApplicationStatus.INTERVIEW) {
            List<StatusEvent> remainingInterviews = statusEventRepository
                    .findByApplicationIdAndStatusOrderByEventDateAscCreatedAtAsc(
                            applicationId, ApplicationStatus.INTERVIEW);
            int round = 1;
            for (StatusEvent interview : remainingInterviews) {
                interview.setInterviewRound(round++);
            }
            statusEventRepository.saveAll(remainingInterviews);
        }

        List<StatusEvent> remaining = statusEventRepository
                .findByApplicationIdOrderByEventDateAscCreatedAtAsc(applicationId);
        application.setCurrentStatus(remaining.get(remaining.size() - 1).getStatus());
        application = applicationRepository.save(application);

        return toResponse(application);
    }

    private void validateStatusEvent(Application application, StatusEventRequest request) {
        ApplicationStatus current = application.getCurrentStatus();
        if (current == ApplicationStatus.REJECTED
                || current == ApplicationStatus.ACCEPTED
                || current == ApplicationStatus.DECLINED) {
            throw new InvalidStatusEventException("This application has already reached a final stage");
        }
        if (request.status() == ApplicationStatus.APPLIED) {
            throw new InvalidStatusEventException(
                    "APPLIED is set automatically when the application is created and can't be logged again");
        }

        boolean isOfferResponse = request.status() == ApplicationStatus.ACCEPTED
                || request.status() == ApplicationStatus.DECLINED;

        // An Offer is the one stage that isn't itself a dead end but also isn't just another
        // rung on the forward ladder: from here the only two next moves are accepting or
        // declining it, never a further hiring stage and never a fresh rejection.
        if (current == ApplicationStatus.OFFER && !isOfferResponse) {
            throw new InvalidStatusEventException("Once an Offer is logged, the only next step is Accepted or Declined");
        }
        if (isOfferResponse && current != ApplicationStatus.OFFER) {
            throw new InvalidStatusEventException(request.status() + " can only be logged after an Offer");
        }

        if (isOfferResponse) {
            if (request.rejectedFromStage() != null || request.interviewType() != null || request.interviewFormat() != null) {
                throw new InvalidStatusEventException(
                        "rejectedFromStage/interviewType/interviewFormat may only be set for their own statuses");
            }
        } else if (request.status() == ApplicationStatus.REJECTED) {
            if (request.rejectedFromStage() == null) {
                throw new InvalidStatusEventException("rejectedFromStage is required when status is REJECTED");
            }
            if (!VALID_REJECTED_FROM_STAGES.contains(request.rejectedFromStage())) {
                throw new InvalidStatusEventException(
                        "rejectedFromStage must be one of APPLIED, OA, PHONE_SCREEN, INTERVIEW");
            }
            if (request.interviewType() != null || request.interviewFormat() != null) {
                throw new InvalidStatusEventException(
                        "interviewType/interviewFormat may only be set when status is INTERVIEW");
            }
        } else {
            if (request.rejectedFromStage() != null) {
                throw new InvalidStatusEventException("rejectedFromStage may only be set when status is REJECTED");
            }

            if (request.status() == ApplicationStatus.INTERVIEW) {
                if (request.interviewType() == null || request.interviewFormat() == null) {
                    throw new InvalidStatusEventException(
                            "interviewType and interviewFormat are required when status is INTERVIEW");
                }
            } else if (request.interviewType() != null || request.interviewFormat() != null) {
                throw new InvalidStatusEventException(
                        "interviewType/interviewFormat may only be set when status is INTERVIEW");
            }

            // Repeating the exact same stage isn't allowed - a real hiring process only has
            // one OA, one Phone Screen, etc. INTERVIEW is the one exception, since multiple
            // rounds are expected and each is already tracked as its own numbered round.
            if (request.status() == current && request.status() != ApplicationStatus.INTERVIEW) {
                throw new InvalidStatusEventException(
                        "This stage has already been logged for this application. Only interview rounds can repeat.");
            }

            if (STAGE_TIER.get(request.status()) < STAGE_TIER.get(current)) {
                throw new InvalidStatusEventException(
                        "Status can't move backward from " + current + " to " + request.status());
            }
        }

        // A later stage's date can never be earlier than a stage that (per the hierarchy)
        // must have already happened first - e.g. an Offer dated before the Phone Screen
        // that led to it doesn't make sense. REJECTED is always treated as the last thing
        // to happen, chronologically, since it's a terminal branch off of whatever stage the
        // application had actually reached. Existing terminal-stage events are impossible to
        // see here since reaching one already blocks any further event via the check above.
        for (StatusEvent existing : statusEventRepository.findByApplicationIdOrderByEventDateAscCreatedAtAsc(
                application.getId())) {
            boolean existingIsAtOrBeforeNewStage = request.status() == ApplicationStatus.REJECTED
                    || STAGE_TIER.get(existing.getStatus()) <= STAGE_TIER.get(request.status());
            if (existingIsAtOrBeforeNewStage && request.eventDate().isBefore(existing.getEventDate())) {
                throw new InvalidStatusEventException(
                        "Date can't be before " + existing.getStatus() + "'s date (" + existing.getEventDate() + ")");
            }
        }
    }

    private Application findOwned(UUID userId, UUID applicationId) {
        return applicationRepository.findByIdAndUserId(applicationId, userId)
                .orElseThrow(() -> new ApplicationNotFoundException(applicationId));
    }

    private ApplicationResponse toResponse(Application application) {
        return new ApplicationResponse(
                application.getId(),
                application.getCompany(),
                application.getRole(),
                application.getJobDescriptionText(),
                application.getDateApplied(),
                application.getCurrentStatus(),
                application.getCreatedAt(),
                application.getUpdatedAt()
        );
    }

    private StatusEventResponse toStatusEventResponse(StatusEvent event) {
        return new StatusEventResponse(
                event.getId(),
                event.getStatus(),
                event.getRejectedFromStage(),
                event.getInterviewRound(),
                event.getInterviewType(),
                event.getInterviewFormat(),
                event.getEventDate(),
                event.getCreatedAt()
        );
    }

    private NoteResponse toNoteResponse(Note note) {
        return new NoteResponse(note.getId(), note.getText(), note.getCreatedAt());
    }
}
