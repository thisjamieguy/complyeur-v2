-- Ensure the lightweight DB health probe exists in the public schema.
-- This stays idempotent so production can safely receive it even if the
-- earlier ping() migration already ran or the function was created manually.
CREATE OR REPLACE FUNCTION public.ping()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 1;
$$;

GRANT EXECUTE ON FUNCTION public.ping() TO anon;
GRANT EXECUTE ON FUNCTION public.ping() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ping() TO service_role;
