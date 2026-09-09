-- Rewords the seeded demo text so no sentence uses a dash as punctuation.
--
-- These strings are real sentences visitors read in demo mode (an application note, and the
-- pre-seeded fit-analysis suggested bullets), and the dash-joined phrasing read as
-- AI-written. The same pass was applied to the app's own hardcoded copy; this migration
-- covers the copy that lives in the database instead.
--
-- Done as a migration rather than by editing V2__seed_demo_data.sql because Flyway has
-- already applied and checksummed V2 against the live database - editing it in place would
-- fail validation on the next startup.
--
-- Surgical REPLACE() per sentence rather than rewriting whole column values: it touches only
-- the affected substring, leaves the surrounding JSON untouched, and is a no-op if a string
-- has already been changed. suggested_bullets is a TEXT column holding a JSON array (see
-- StringListJsonConverter), so a plain string replace is safe. fit_analyses.input_hash is
-- deliberately NOT touched - it hashes the resume and job description, not this output, so
-- demo fit-analysis requests keep hitting the pre-seeded cache and never call Gemini.

UPDATE notes SET text = REPLACE(
    text,
    'Phone screen went well - focused on React state management and SQL joins.',
    'Phone screen went well. They focused on React state management and SQL joins.');

UPDATE fit_analyses SET suggested_bullets = REPLACE(
    suggested_bullets,
    'surface them - robotics teams value that context.',
    'surface them, because robotics teams value that context.');

UPDATE fit_analyses SET suggested_bullets = REPLACE(
    suggested_bullets,
    'is a strong match - keep that bullet prominent near the top.',
    'is a strong match, so keep that bullet prominent near the top.');

UPDATE fit_analyses SET suggested_bullets = REPLACE(
    suggested_bullets,
    'exposure explicitly - it directly matches this posting.',
    'exposure explicitly, since it directly matches this posting.');

UPDATE fit_analyses SET suggested_bullets = REPLACE(
    suggested_bullets,
    'Java experience is relevant here - lead with that over more general full-stack work.',
    'Java experience is relevant here, so lead with that over more general full-stack work.');

UPDATE fit_analyses SET suggested_bullets = REPLACE(
    suggested_bullets,
    'is a near-perfect match - keep it front and center.',
    'is a near-perfect match, so keep it front and center.');

UPDATE fit_analyses SET suggested_bullets = REPLACE(
    suggested_bullets,
    'tools you haven''t listed - consider a project bullet if you have any relevant exposure.',
    'tools you haven''t listed, so consider a project bullet if you have any relevant exposure.');

UPDATE fit_analyses SET suggested_bullets = REPLACE(
    suggested_bullets,
    'system design thinking - even a class project where you designed an architecture counts.',
    'system design thinking. Even a class project where you designed an architecture counts.');

UPDATE fit_analyses SET suggested_bullets = REPLACE(
    suggested_bullets,
    'background lines up well - keep those bullets specific and quantified.',
    'background lines up well, so keep those bullets specific and quantified.');

UPDATE fit_analyses SET suggested_bullets = REPLACE(
    suggested_bullets,
    'exactly what this role needs - well matched already.',
    'exactly what this role needs, so you''re well matched already.');

UPDATE fit_analyses SET suggested_bullets = REPLACE(
    suggested_bullets,
    'even introductory, add a line - it aligns with the team''s focus.',
    'even introductory, add a line, since it aligns with the team''s focus.');

UPDATE fit_analyses SET suggested_bullets = REPLACE(
    suggested_bullets,
    'background matches directly - no major gaps here.',
    'background matches directly, with no major gaps here.');

UPDATE fit_analyses SET suggested_bullets = REPLACE(
    suggested_bullets,
    'experience you haven''t demonstrated - likely not a strong match without additional coursework.',
    'experience you haven''t demonstrated, so it''s likely not a strong match without additional coursework.');
