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
import com.ontrack.backend.repository.ApplicationRepository;
import com.ontrack.backend.repository.NoteRepository;
import com.ontrack.backend.repository.StatusEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class ApplicationService {

    static final int MAX_APPLICATIONS_PER_USER = 100;

    private static final Set<ApplicationStatus> VALID_REJECTED_FROM_STAGES = EnumSet.of(
            ApplicationStatus.APPLIED,
            ApplicationStatus.OA,
            ApplicationStatus.PHONE_SCREEN,
            ApplicationStatus.ONSITE_FINAL
    );

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
        validateStatusEvent(request);

        StatusEvent event = StatusEvent.builder()
                .application(application)
                .status(request.status())
                .rejectedFromStage(request.rejectedFromStage())
                .eventDate(request.eventDate())
                .build();
        statusEventRepository.save(event);

        application.setCurrentStatus(request.status());
        application = applicationRepository.save(application);

        return toResponse(application);
    }

    private void validateStatusEvent(StatusEventRequest request) {
        if (request.status() == ApplicationStatus.REJECTED) {
            if (request.rejectedFromStage() == null) {
                throw new InvalidStatusEventException("rejectedFromStage is required when status is REJECTED");
            }
            if (!VALID_REJECTED_FROM_STAGES.contains(request.rejectedFromStage())) {
                throw new InvalidStatusEventException(
                        "rejectedFromStage must be one of APPLIED, OA, PHONE_SCREEN, ONSITE_FINAL");
            }
        } else if (request.rejectedFromStage() != null) {
            throw new InvalidStatusEventException("rejectedFromStage may only be set when status is REJECTED");
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
                event.getEventDate(),
                event.getCreatedAt()
        );
    }

    private NoteResponse toNoteResponse(Note note) {
        return new NoteResponse(note.getId(), note.getText(), note.getCreatedAt());
    }
}
