ALTER TABLE public.company_entitlements
  ADD COLUMN IF NOT EXISTS last_stripe_event_id text,
  ADD COLUMN IF NOT EXISTS last_stripe_event_type text,
  ADD COLUMN IF NOT EXISTS last_stripe_event_created_at timestamptz;

COMMENT ON COLUMN public.company_entitlements.last_stripe_event_id IS
  'Most recent Stripe event ID applied to this entitlement row.';

COMMENT ON COLUMN public.company_entitlements.last_stripe_event_type IS
  'Most recent Stripe event type applied to this entitlement row.';

COMMENT ON COLUMN public.company_entitlements.last_stripe_event_created_at IS
  'Most recent Stripe event.created timestamp applied to this entitlement row; used to ignore older lifecycle events.';
