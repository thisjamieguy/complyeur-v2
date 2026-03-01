-- Store the Stripe subscription's current period end date so the cron
-- can query upcoming renewals without hitting the Stripe API.
ALTER TABLE company_entitlements
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- General-purpose billing email deduplication log.
-- reference_key allows one send per event instance:
--   trial_expiring  → 'once'         (send once per company, ever)
--   upcoming_renewal → '2026-04-01'  (the renewal date, allows re-sending each period)
CREATE TABLE billing_email_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email_type    text        NOT NULL,
  reference_key text        NOT NULL,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_email_log_unique UNIQUE (company_id, email_type, reference_key)
);

ALTER TABLE billing_email_log ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — service role only (cron jobs).

CREATE INDEX billing_email_log_company_id_idx ON billing_email_log (company_id);
