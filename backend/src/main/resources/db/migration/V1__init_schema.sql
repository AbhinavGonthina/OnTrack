CREATE TABLE users (
    id             UUID PRIMARY KEY,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    resume_text    TEXT,
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE applications (
    id                    UUID PRIMARY KEY,
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company               VARCHAR(255) NOT NULL,
    role                  VARCHAR(255) NOT NULL,
    job_description_text  TEXT,
    date_applied          DATE NOT NULL,
    current_status        VARCHAR(20) NOT NULL
        CHECK (current_status IN ('APPLIED','OA','PHONE_SCREEN','ONSITE_FINAL','OFFER','REJECTED')),
    created_at            TIMESTAMP NOT NULL DEFAULT now(),
    updated_at            TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_current_status ON applications(current_status);

CREATE TABLE status_events (
    id                    UUID PRIMARY KEY,
    application_id        UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    status                VARCHAR(20) NOT NULL
        CHECK (status IN ('APPLIED','OA','PHONE_SCREEN','ONSITE_FINAL','OFFER','REJECTED')),
    rejected_from_stage    VARCHAR(20)
        CHECK (rejected_from_stage IN ('APPLIED','OA','PHONE_SCREEN','ONSITE_FINAL')),
    event_date            DATE NOT NULL,
    created_at            TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_status_events_application_id ON status_events(application_id);
CREATE INDEX idx_status_events_status ON status_events(status);

CREATE TABLE notes (
    id                UUID PRIMARY KEY,
    application_id    UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    text              TEXT NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_notes_application_id ON notes(application_id);

CREATE TABLE fit_analyses (
    id                    UUID PRIMARY KEY,
    application_id        UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    input_hash            VARCHAR(64) NOT NULL,
    fit_score             INTEGER NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
    missing_keywords      TEXT,
    suggested_bullets     TEXT,
    created_at            TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (application_id, input_hash)
);
CREATE INDEX idx_fit_analyses_application_id ON fit_analyses(application_id);
