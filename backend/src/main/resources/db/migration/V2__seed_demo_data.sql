-- Seeds a fixed, well-known demo user with realistic SWE applications so
-- unauthenticated visitors can browse a populated dashboard. Demo mode is
-- strictly read-only: writes go through separate stub endpoints in the app
-- layer, not this migration.
--
-- pgcrypto's digest() is used so each seeded FitAnalysis row's input_hash
-- exactly matches what FitAnalysisService.sha256Hex(resumeText + jobDescriptionText)
-- would compute at runtime - this makes the existing cache-hit code path
-- naturally serve these rows with zero special-casing, and guarantees a live
-- Gemini call never happens for demo data.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (id, email, password_hash, resume_text, created_at)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'demo@ontrack.app',
    'DEMO_ACCOUNT_NO_LOGIN',
    $$Recent Computer Science graduate with experience building full-stack web applications using React, Node.js, and PostgreSQL. Completed a summer internship developing REST APIs and automated testing pipelines. Strong foundation in data structures, algorithms, and object-oriented design. Familiar with Git, Docker, and basic CI/CD workflows. Passionate about writing clean, maintainable code and collaborating in agile teams.$$,
    now()
);

-- === Applications ===

INSERT INTO applications (id, user_id, company, role, job_description_text, date_applied, current_status, created_at, updated_at) VALUES
('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Nebula Systems', 'Software Engineer Intern',
 $$We're looking for a motivated SWE intern to join our platform team, working on distributed backend services in Go and Python. Experience with Kubernetes and cloud infrastructure is a plus.$$,
 '2026-05-10', 'REJECTED', now(), now()),
('a0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'BrightPath Analytics', 'New Grad Software Engineer',
 $$Join our data platform team building ETL pipelines and analytics dashboards. Requires strong SQL skills, Python, and familiarity with Airflow or similar orchestration tools.$$,
 '2026-05-18', 'REJECTED', now(), now()),
('a0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Ironclad Robotics', 'Backend Engineer Intern',
 $$Backend intern role building APIs for robotics fleet management software. Java or C++ experience preferred, along with a solid grasp of REST API design.$$,
 '2026-06-01', 'APPLIED', now(), now()),
('a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'Solstice Health Tech', 'Software Engineer I',
 $$Building patient-facing web applications in a HIPAA-compliant environment. Looking for React, Node.js, and PostgreSQL experience, plus attention to security best practices.$$,
 '2026-06-05', 'REJECTED', now(), now()),
('a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'Vertex Cloud', 'Software Engineer Intern',
 $$Cloud infrastructure team seeking an intern to help build internal developer tooling. Familiarity with AWS, Docker, and CI/CD pipelines is highly valued.$$,
 '2026-06-15', 'OA', now(), now()),
('a0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001', 'Meridian Labs', 'Backend Engineer',
 $$Backend role focused on high-throughput payment processing systems. Requires strong Java or Kotlin skills and experience with distributed transactions.$$,
 '2026-06-20', 'REJECTED', now(), now()),
('a0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001', 'Quantum Retail', 'Software Engineer',
 $$E-commerce platform team building checkout and inventory services. Looking for full-stack experience with React, Node.js, and relational databases.$$,
 '2026-06-25', 'PHONE_SCREEN', now(), now()),
('a0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000001', 'Northwind Data', 'New Grad Software Engineer',
 $$Data infrastructure team building real-time streaming pipelines with Kafka and Spark. CS fundamentals and a strong grasp of distributed systems required.$$,
 '2026-06-28', 'REJECTED', now(), now()),
('a0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000001', 'Cascade Fintech', 'Software Engineer II',
 $$Fintech platform team building trading and settlement systems. Strong Java, SQL, and system design skills required, along with a passion for financial technology.$$,
 '2026-07-01', 'ONSITE_FINAL', now(), now()),
('a0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000001', 'Pinnacle AI', 'Software Engineer Intern',
 $$AI tooling team building developer-facing products for prompt engineering and evaluation. Looking for strong full-stack skills and curiosity about ML systems.$$,
 '2026-05-20', 'OFFER', now(), now()),
('a0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000001', 'Driftwood Logistics', 'Backend Developer',
 $$Supply chain software team building tracking and routing systems. Node.js and PostgreSQL experience preferred.$$,
 '2026-07-20', 'APPLIED', now(), now()),
('a0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000001', 'Skyline Networks', 'Software Engineer Intern',
 $$Networking infrastructure team building monitoring tools for large-scale network deployments. C++ and networking fundamentals required.$$,
 '2026-07-25', 'REJECTED', now(), now());

-- === Status events (append-only history matching each application's current_status) ===

INSERT INTO status_events (id, application_id, status, rejected_from_stage, event_date, created_at) VALUES
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', 'APPLIED', NULL, '2026-05-10', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', 'REJECTED', 'APPLIED', '2026-05-24', now()),

(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'APPLIED', NULL, '2026-05-18', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'REJECTED', 'APPLIED', '2026-06-02', now()),

(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', 'APPLIED', NULL, '2026-06-01', now()),

(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000004', 'APPLIED', NULL, '2026-06-05', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000004', 'OA', NULL, '2026-06-12', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000004', 'REJECTED', 'OA', '2026-06-20', now()),

(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'APPLIED', NULL, '2026-06-15', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'OA', NULL, '2026-06-25', now()),

(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000006', 'APPLIED', NULL, '2026-06-20', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000006', 'OA', NULL, '2026-06-28', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000006', 'PHONE_SCREEN', NULL, '2026-07-05', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000006', 'REJECTED', 'PHONE_SCREEN', '2026-07-12', now()),

(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000007', 'APPLIED', NULL, '2026-06-25', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000007', 'OA', NULL, '2026-07-02', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000007', 'PHONE_SCREEN', NULL, '2026-07-10', now()),

(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000008', 'APPLIED', NULL, '2026-06-28', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000008', 'OA', NULL, '2026-07-05', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000008', 'PHONE_SCREEN', NULL, '2026-07-15', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000008', 'ONSITE_FINAL', NULL, '2026-07-25', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000008', 'REJECTED', 'ONSITE_FINAL', '2026-08-01', now()),

(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000009', 'APPLIED', NULL, '2026-07-01', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000009', 'OA', NULL, '2026-07-08', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000009', 'PHONE_SCREEN', NULL, '2026-07-18', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000009', 'ONSITE_FINAL', NULL, '2026-08-05', now()),

(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000010', 'APPLIED', NULL, '2026-05-20', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000010', 'OA', NULL, '2026-05-28', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000010', 'PHONE_SCREEN', NULL, '2026-06-05', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000010', 'ONSITE_FINAL', NULL, '2026-06-15', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000010', 'OFFER', NULL, '2026-06-22', now()),

(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000011', 'APPLIED', NULL, '2026-07-20', now()),

(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000012', 'APPLIED', NULL, '2026-07-25', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000012', 'REJECTED', 'APPLIED', '2026-08-08', now());

-- === Notes (a few, for realism) ===

INSERT INTO notes (id, application_id, text, created_at) VALUES
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'Recruiter mentioned the OA is on HackerRank, 90 minutes, 2 questions.', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000007', 'Phone screen went well - focused on React state management and SQL joins.', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000009', 'Onsite is 4 rounds: coding, system design, behavioral, and a Java-specific round.', now()),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000010', 'Offer: $95k base + signing bonus. Need to respond by end of month.', now());

-- === Pre-seeded FitAnalysis rows (input_hash computed to match the runtime
-- cache-lookup exactly, so GET-ing fit-analysis for demo data always hits
-- this cached row and never calls Gemini) ===

INSERT INTO fit_analyses (id, application_id, input_hash, fit_score, missing_keywords, suggested_bullets, created_at)
SELECT
    gen_random_uuid(),
    app.id,
    encode(digest(demo_user.resume_text || app.job_description_text, 'sha256'), 'hex'),
    seed.fit_score,
    seed.missing_keywords,
    seed.suggested_bullets,
    now()
FROM applications app
JOIN users demo_user ON demo_user.id = 'd0000000-0000-0000-0000-000000000001'
JOIN (VALUES
    ('a0000000-0000-0000-0000-000000000001'::uuid, 58, '["Go","Kubernetes","Distributed Systems"]', '["Highlight any exposure to distributed systems or backend service design, even from coursework or personal projects.","Mention Python experience explicitly if you have any, since it''s a core requirement here."]'),
    ('a0000000-0000-0000-0000-000000000002'::uuid, 52, '["Airflow","ETL","Data Pipelines"]', '["Emphasize any SQL or data-processing coursework/projects to align with the ETL focus.","Consider adding a project bullet around data pipeline or batch-processing work if you have one."]'),
    ('a0000000-0000-0000-0000-000000000003'::uuid, 74, '["C++","Fleet Management"]', '["Reframe your REST API project bullet to highlight Java specifically, since that''s your strongest match here.","If you''ve touched any embedded or hardware-adjacent projects, surface them - robotics teams value that context."]'),
    ('a0000000-0000-0000-0000-000000000004'::uuid, 81, '["HIPAA","Security Best Practices"]', '["Add a line about any security-conscious development practices you''ve followed (auth, input validation, etc.).","Your React/Node/Postgres experience is a strong match - keep that bullet prominent near the top."]'),
    ('a0000000-0000-0000-0000-000000000005'::uuid, 69, '["AWS","CI/CD"]', '["Mention your Docker and basic CI/CD exposure explicitly - it directly matches this posting.","If you''ve used any cloud provider, even personal projects on free tiers, call it out."]'),
    ('a0000000-0000-0000-0000-000000000006'::uuid, 61, '["Kotlin","Distributed Transactions","Payments"]', '["Since payments/fintech is the focus, consider highlighting any project involving transactional integrity or financial data.","Java experience is relevant here - lead with that over more general full-stack work."]'),
    ('a0000000-0000-0000-0000-000000000007'::uuid, 85, '["Inventory Systems"]', '["Your full-stack React/Node/SQL background is a near-perfect match - keep it front and center.","If you have any e-commerce or checkout-flow-adjacent project, add a bullet for it."]'),
    ('a0000000-0000-0000-0000-000000000008'::uuid, 64, '["Kafka","Spark","Streaming"]', '["This role leans heavily on streaming/big-data tools you haven''t listed - consider a project bullet if you have any relevant exposure.","Emphasize CS fundamentals (algorithms, systems coursework) since that''s explicitly called out."]'),
    ('a0000000-0000-0000-0000-000000000009'::uuid, 77, '["System Design","Trading Systems"]', '["Add a bullet demonstrating system design thinking - even a class project where you designed an architecture counts.","Your Java and SQL background lines up well - keep those bullets specific and quantified."]'),
    ('a0000000-0000-0000-0000-000000000010'::uuid, 88, '["ML Systems"]', '["Your full-stack background is exactly what this role needs - well matched already.","If you''ve taken any ML or AI coursework, even introductory, add a line - it aligns with the team''s focus."]'),
    ('a0000000-0000-0000-0000-000000000011'::uuid, 79, '["Logistics Domain"]', '["Your Node.js/PostgreSQL background matches directly - no major gaps here.","If you have any project involving geolocation, routing, or scheduling logic, it would strengthen this application."]'),
    ('a0000000-0000-0000-0000-000000000012'::uuid, 41, '["C++","Networking Fundamentals","Monitoring Tools"]', '["This role requires low-level networking and C++ experience you haven''t demonstrated - likely not a strong match without additional coursework.","If you have any networking coursework, even intro-level, it''s worth adding for context."]')
) AS seed(application_id, fit_score, missing_keywords, suggested_bullets)
    ON seed.application_id = app.id
WHERE app.user_id = 'd0000000-0000-0000-0000-000000000001';
