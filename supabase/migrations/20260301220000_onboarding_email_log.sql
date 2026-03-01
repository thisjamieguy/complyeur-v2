-- Tracks which onboarding sequence emails have been sent per company.
-- The unique constraint on (company_id, step) prevents duplicate sends
-- if the cron runs more than once due to retries.
--
-- Steps:
--   'day1_add_employee' — sent 24h after signup if no employees added
--   'day3_add_trip'     — sent 72h after signup if employees added but no trips

CREATE TABLE onboarding_email_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  step       text        NOT NULL,
  sent_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_email_log_company_step_unique UNIQUE (company_id, step)
);

ALTER TABLE onboarding_email_log ENABLE ROW LEVEL SECURITY;
-- Intentionally no user-facing RLS policies.
-- Table is only accessed via service role key in cron jobs.

CREATE INDEX onboarding_email_log_company_id_idx ON onboarding_email_log (company_id);
