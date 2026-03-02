-- Lightweight health-check function that validates a DB round-trip
-- without querying any business data tables.
CREATE OR REPLACE FUNCTION ping()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 1;
$$;

-- Allow the anon role to call this so unauthenticated health probes work.
GRANT EXECUTE ON FUNCTION ping() TO anon;
GRANT EXECUTE ON FUNCTION ping() TO authenticated;
