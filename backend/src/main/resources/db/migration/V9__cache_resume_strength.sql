-- Cache the resume strength score the same way fit analysis has always been cached.
--
-- Scoring was the one Gemini feature with no caching at all, so every click cost a real call
-- even when the resume had not changed by a character. Fit analysis solved this in V1 with a
-- SHA-256 of its inputs; this is the same idea keyed on the resume text alone.
--
-- One row per user rather than one per (user, hash). This table answers "how strong is the
-- resume you have now", so history has no consumer, and a row per revision would grow without
-- bound for anyone actively editing. Re-scoring after an edit overwrites in place. The tradeoff
-- is that editing and then undoing an edit re-scores instead of hitting an older cached row,
-- which costs one call and keeps the table exactly as large as the user count.
CREATE TABLE resume_strengths (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    -- SHA-256 of the exact resume text that was scored. A mismatch against the user's current
    -- text is what marks this row stale, so a stale row is never served.
    input_hash      VARCHAR(64) NOT NULL,
    score           INTEGER     NOT NULL,
    -- JSON, matching how fit_analyses stores missing_keywords and suggested_bullets.
    categories      TEXT        NOT NULL,
    recommendations TEXT        NOT NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT now()
);
