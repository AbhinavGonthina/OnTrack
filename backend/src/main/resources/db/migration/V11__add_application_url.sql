-- An optional link back to the original job posting or the employer's application portal.
--
-- 2048 characters because that is the practical ceiling browsers and proxies agree on for a URL,
-- and ATS links carry long tracking query strings (Workday and Greenhouse routinely exceed 500).
-- Nullable: most applications will not have one, and requiring it would make the create form
-- worse for no benefit.
--
-- Note this is rendered as a clickable anchor in the UI, so the scheme is validated on the way
-- in (http and https only). See ApplicationService.normalizeApplicationUrl.
ALTER TABLE applications ADD COLUMN application_url VARCHAR(2048);
