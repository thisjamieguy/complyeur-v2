BEGIN;

DROP POLICY IF EXISTS "No client access to billing email log" ON public.billing_email_log;
CREATE POLICY "No client access to billing email log"
ON public.billing_email_log
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "No client access to onboarding email log" ON public.onboarding_email_log;
CREATE POLICY "No client access to onboarding email log"
ON public.onboarding_email_log
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "No client access to stripe webhook events" ON public.stripe_webhook_events;
CREATE POLICY "No client access to stripe webhook events"
ON public.stripe_webhook_events
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

COMMIT;
