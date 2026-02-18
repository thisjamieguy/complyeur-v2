-- Enable RLS on stripe_webhook_events table.
-- This table is only accessed by the webhook handler via service_role (admin client),
-- which bypasses RLS. No authenticated/anon policies are needed — the default
-- deny-all behaviour is correct here.
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Activate the rls_auto_enable function so future tables get RLS automatically.
-- The function already exists but was never connected to an event trigger.
CREATE EVENT TRIGGER rls_auto_enable_trigger
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE')
  EXECUTE FUNCTION public.rls_auto_enable();
