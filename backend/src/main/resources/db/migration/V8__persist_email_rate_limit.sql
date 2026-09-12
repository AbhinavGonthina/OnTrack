-- Move the per-email send limit off in-memory buckets into Postgres.
--
-- EmailRateLimiter kept Bucket4j buckets in a ConcurrentHashMap, so the cap reset on every
-- process restart, and Render's free tier spins down after ~15 minutes idle. That was already
-- weak for resend-verification and forgot-password; signup now re-sends a verification link for
-- an unverified address, so it depends on this limiter too, and the difference between a real
-- cap and a speed bump is the difference between someone being able to flood a stranger's inbox
-- through the signup form or not. Same reasoning as V6 applied to gemini_usage.
--
-- Keyed on a lowercased email and an hour-truncated window, so the count is a true per-hour
-- allowance rather than Bucket4j's sliding refill.
CREATE TABLE email_rate_limit (
    email          VARCHAR(255) NOT NULL,
    window_start   TIMESTAMPTZ  NOT NULL,
    request_count  INTEGER      NOT NULL,
    PRIMARY KEY (email, window_start)
);

-- Supports pruning windows that have aged out. Nothing reads old rows, they just accumulate.
CREATE INDEX idx_email_rate_limit_window ON email_rate_limit (window_start);
