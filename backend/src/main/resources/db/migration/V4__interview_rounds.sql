-- Replaces the single "ONSITE_FINAL" stage with a general INTERVIEW status plus per-event
-- round/type/format detail, so an application can have any number of interview rounds
-- (numbered globally per application, in chronological order, regardless of type mix).
-- Global round numbers are what let the Sankey funnel chart distinguish "round 1" from
-- "round 2" as separate nodes - without that, a real interview loop (e.g. Technical then
-- Behavioral then Technical again) looks identical to a genuine backward transition to the
-- chart, which is what caused the earlier crash.

ALTER TABLE applications DROP CONSTRAINT applications_current_status_check;
ALTER TABLE status_events DROP CONSTRAINT status_events_status_check;
ALTER TABLE status_events DROP CONSTRAINT status_events_rejected_from_stage_check;

ALTER TABLE status_events ADD COLUMN interview_round INTEGER;
ALTER TABLE status_events ADD COLUMN interview_type VARCHAR(20)
    CHECK (interview_type IN ('TECHNICAL', 'BEHAVIORAL', 'BOTH'));
ALTER TABLE status_events ADD COLUMN interview_format VARCHAR(20)
    CHECK (interview_format IN ('ONLINE', 'IN_PERSON'));

-- Backfill any existing ONSITE_FINAL rows before renaming them, numbering per application in
-- chronological order (the same rule new INTERVIEW rows will follow going forward). Type/format
-- default to BOTH/ONLINE - arbitrary but harmless, since only seeded demo data has these rows.
WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY application_id ORDER BY event_date, created_at) AS rn
    FROM status_events
    WHERE status = 'ONSITE_FINAL'
)
UPDATE status_events se
SET interview_round = numbered.rn,
    interview_type = 'BOTH',
    interview_format = 'ONLINE'
FROM numbered
WHERE se.id = numbered.id;

UPDATE applications SET current_status = 'INTERVIEW' WHERE current_status = 'ONSITE_FINAL';
UPDATE status_events SET status = 'INTERVIEW' WHERE status = 'ONSITE_FINAL';
UPDATE status_events SET rejected_from_stage = 'INTERVIEW' WHERE rejected_from_stage = 'ONSITE_FINAL';

ALTER TABLE applications ADD CONSTRAINT applications_current_status_check
    CHECK (current_status IN ('APPLIED', 'OA', 'PHONE_SCREEN', 'INTERVIEW', 'OFFER', 'REJECTED'));
ALTER TABLE status_events ADD CONSTRAINT status_events_status_check
    CHECK (status IN ('APPLIED', 'OA', 'PHONE_SCREEN', 'INTERVIEW', 'OFFER', 'REJECTED'));
ALTER TABLE status_events ADD CONSTRAINT status_events_rejected_from_stage_check
    CHECK (rejected_from_stage IN ('APPLIED', 'OA', 'PHONE_SCREEN', 'INTERVIEW'));
