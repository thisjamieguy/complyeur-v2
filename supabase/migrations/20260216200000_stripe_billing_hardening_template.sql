-- Stripe billing hardening template
-- Adds/validates billing identifiers, subscription status constraints,
-- and webhook idempotency tracking.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

ALTER TABLE public.company_entitlements
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none';

ALTER TABLE public.tiers
  ADD COLUMN IF NOT EXISTS stripe_price_id_monthly text,
  ADD COLUMN IF NOT EXISTS stripe_price_id_annual text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'company_entitlements_subscription_status_allowed_chk'
  ) THEN
    ALTER TABLE public.company_entitlements
      ADD CONSTRAINT company_entitlements_subscription_status_allowed_chk
      CHECK (
        subscription_status IN (
          'none',
          'trialing',
          'active',
          'past_due',
          'incomplete',
          'incomplete_expired',
          'canceled',
          'unpaid',
          'paused'
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'companies_stripe_customer_id_format_chk'
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_stripe_customer_id_format_chk
      CHECK (
        stripe_customer_id IS NULL
        OR stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'company_entitlements_stripe_subscription_id_format_chk'
  ) THEN
    ALTER TABLE public.company_entitlements
      ADD CONSTRAINT company_entitlements_stripe_subscription_id_format_chk
      CHECK (
        stripe_subscription_id IS NULL
        OR stripe_subscription_id ~ '^sub_[A-Za-z0-9]+$'
      );
  END IF;
END
$$;

-- Clear placeholder price IDs that don't match real Stripe format (price_XYZ)
-- before adding the format constraint. Placeholders from launch_tier_rebrand
-- contain underscores (e.g. 'price_basic_monthly_gbp') which are not valid.
UPDATE public.tiers
  SET stripe_price_id_monthly = NULL
  WHERE stripe_price_id_monthly IS NOT NULL
    AND stripe_price_id_monthly !~ '^price_[A-Za-z0-9]+$';

UPDATE public.tiers
  SET stripe_price_id_annual = NULL
  WHERE stripe_price_id_annual IS NOT NULL
    AND stripe_price_id_annual !~ '^price_[A-Za-z0-9]+$';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tiers_stripe_price_id_monthly_format_chk'
  ) THEN
    ALTER TABLE public.tiers
      ADD CONSTRAINT tiers_stripe_price_id_monthly_format_chk
      CHECK (
        stripe_price_id_monthly IS NULL
        OR stripe_price_id_monthly ~ '^price_[A-Za-z0-9]+$'
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tiers_stripe_price_id_annual_format_chk'
  ) THEN
    ALTER TABLE public.tiers
      ADD CONSTRAINT tiers_stripe_price_id_annual_format_chk
      CHECK (
        stripe_price_id_annual IS NULL
        OR stripe_price_id_annual ~ '^price_[A-Za-z0-9]+$'
      );
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS companies_stripe_customer_id_unique_idx
  ON public.companies (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS company_entitlements_stripe_subscription_id_unique_idx
  ON public.company_entitlements (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processing_status text NOT NULL DEFAULT 'processing',
  last_error text,
  received_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT stripe_webhook_events_processing_status_chk
    CHECK (processing_status IN ('processing', 'processed', 'failed'))
);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_event_type_idx
  ON public.stripe_webhook_events (event_type);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_status_idx
  ON public.stripe_webhook_events (processing_status);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_stripe_webhook_events_updated_at'
  ) THEN
    CREATE TRIGGER update_stripe_webhook_events_updated_at
      BEFORE UPDATE ON public.stripe_webhook_events
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

COMMENT ON TABLE public.stripe_webhook_events IS
  'Stripe webhook idempotency and processing log table.';
COMMENT ON COLUMN public.stripe_webhook_events.stripe_event_id IS
  'Stripe event identifier (evt_...) used for idempotency.';
COMMENT ON COLUMN public.company_entitlements.subscription_status IS
  'Latest Stripe subscription status mirrored for entitlement checks.';

COMMIT;
