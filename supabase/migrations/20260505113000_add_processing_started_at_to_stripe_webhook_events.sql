BEGIN;

ALTER TABLE public.stripe_webhook_events
ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

UPDATE public.stripe_webhook_events
SET processing_started_at = COALESCE(updated_at, received_at, created_at)
WHERE processing_status = 'processing'
  AND processing_started_at IS NULL;

CREATE INDEX IF NOT EXISTS stripe_webhook_events_processing_started_at_idx
  ON public.stripe_webhook_events (processing_started_at)
  WHERE processing_status = 'processing';

COMMENT ON COLUMN public.stripe_webhook_events.processing_started_at IS
  'UTC timestamp for the current webhook processing claim; stale processing rows can be reclaimed after a timeout.';

COMMIT;
