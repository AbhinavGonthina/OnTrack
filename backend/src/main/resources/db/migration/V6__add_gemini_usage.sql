-- Per-user daily Gemini call counter, moved out of process memory.
--
-- GeminiRateLimiter previously held Bucket4j buckets in a ConcurrentHashMap, which meant the
-- per-user daily cap reset on every restart. On Render's free tier the service spins down after
-- ~15 minutes idle, so in practice a user could reclaim their full daily allowance just by
-- coming back later - the cap barely held at all. Google's own free-tier request-per-day quota
-- is shared across the whole project (not per OnTrack user), so a cap that silently resets is a
-- real cost/availability hole, not just an inaccuracy.
--
-- One row per user per day they actually make a call, so this stays tiny; old rows are harmless
-- and can be pruned later if it ever matters. ON DELETE CASCADE keeps it consistent with how
-- every other user-owned table behaves when an account is deleted.

CREATE TABLE gemini_usage (
    user_id    UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_date DATE    NOT NULL,
    call_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, usage_date)
);
