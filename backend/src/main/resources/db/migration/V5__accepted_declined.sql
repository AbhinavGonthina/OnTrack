-- Adds ACCEPTED/DECLINED as the two possible responses to an Offer - the only stages that
-- can ever follow OFFER, and themselves fully terminal (like REJECTED). rejected_from_stage's
-- own value set is unaffected: you can't be "rejected from" an offer response.

ALTER TABLE applications DROP CONSTRAINT applications_current_status_check;
ALTER TABLE status_events DROP CONSTRAINT status_events_status_check;

ALTER TABLE applications ADD CONSTRAINT applications_current_status_check
    CHECK (current_status IN ('APPLIED', 'OA', 'PHONE_SCREEN', 'INTERVIEW', 'OFFER', 'ACCEPTED', 'DECLINED', 'REJECTED'));
ALTER TABLE status_events ADD CONSTRAINT status_events_status_check
    CHECK (status IN ('APPLIED', 'OA', 'PHONE_SCREEN', 'INTERVIEW', 'OFFER', 'ACCEPTED', 'DECLINED', 'REJECTED'));
