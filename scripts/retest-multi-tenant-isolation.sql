-- Adversarial multi-tenant isolation retest.
-- Run against a local/staging database after migrations are applied:
--   docker exec -i supabase_db_complyeur psql -U postgres -d postgres -v ON_ERROR_STOP=1 < scripts/retest-multi-tenant-isolation.sql
--
-- The script runs inside one transaction and rolls back all fixture data.

\set ON_ERROR_STOP on

BEGIN;

SET LOCAL client_min_messages = warning;

INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES
  (
    '00000000-0000-4000-8000-000000000201',
    'authenticated',
    'authenticated',
    'tenant-a-isolation@example.test',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"company_name":"Isolation Tenant A"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    'authenticated',
    'authenticated',
    'tenant-b-isolation@example.test',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"company_name":"Isolation Tenant B"}'::jsonb
  );

CREATE TEMP TABLE isolation_retest_ids AS
SELECT
  '00000000-0000-4000-8000-000000000201'::uuid AS user_a,
  '00000000-0000-4000-8000-000000000202'::uuid AS user_b,
  '00000000-0000-4000-8000-000000000301'::uuid AS employee_a,
  '00000000-0000-4000-8000-000000000302'::uuid AS employee_b,
  '00000000-0000-4000-8000-000000000401'::uuid AS audit_entry,
  '00000000-0000-4000-8000-000000000501'::uuid AS trip_a,
  (
    SELECT company_id
    FROM public.profiles
    WHERE id = '00000000-0000-4000-8000-000000000201'::uuid
  ) AS company_a,
  (
    SELECT company_id
    FROM public.profiles
    WHERE id = '00000000-0000-4000-8000-000000000202'::uuid
  ) AS company_b;

GRANT SELECT ON isolation_retest_ids TO authenticated, service_role;

UPDATE public.company_entitlements
SET subscription_status = 'active',
    is_suspended = false
WHERE company_id IN (
  (SELECT company_a FROM isolation_retest_ids),
  (SELECT company_b FROM isolation_retest_ids)
);

INSERT INTO public.company_settings (company_id)
SELECT company_a FROM isolation_retest_ids
UNION ALL
SELECT company_b FROM isolation_retest_ids;

INSERT INTO public.employees (id, company_id, name)
SELECT employee_a, company_a, 'Tenant A Employee'
FROM isolation_retest_ids
UNION ALL
SELECT employee_b, company_b, 'Tenant B Employee'
FROM isolation_retest_ids;

INSERT INTO public.audit_log (
  id,
  company_id,
  user_id,
  action,
  entity_type,
  entity_id,
  details
)
VALUES (
  '00000000-0000-4000-8000-000000000401',
  (SELECT company_a FROM isolation_retest_ids),
  '00000000-0000-4000-8000-000000000201',
  'isolation.retest.created',
  'employee',
  '00000000-0000-4000-8000-000000000301',
  '{"retest":true}'::jsonb
);

INSERT INTO public.waitlist (email, company_name, source)
VALUES ('waitlist-isolation@example.test', 'Isolation Waitlist', 'landing');

SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000201', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  failed boolean := false;
BEGIN
  BEGIN
    UPDATE public.audit_log
    SET action = 'isolation.retest.tampered'
    WHERE id = '00000000-0000-4000-8000-000000000401';
  EXCEPTION WHEN others THEN
    failed := true;
  END;

  IF failed IS NOT TRUE THEN
    RAISE EXCEPTION 'audit_log UPDATE did not fail for authenticated user';
  END IF;
END
$$;

DO $$
DECLARE
  failed boolean := false;
BEGIN
  BEGIN
    DELETE FROM public.audit_log
    WHERE id = '00000000-0000-4000-8000-000000000401';
  EXCEPTION WHEN others THEN
    failed := true;
  END;

  IF failed IS NOT TRUE THEN
    RAISE EXCEPTION 'audit_log DELETE did not fail for authenticated user';
  END IF;
END
$$;

DO $$
DECLARE
  failed boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.trips (
      employee_id,
      company_id,
      country,
      entry_date,
      exit_date
    )
    VALUES (
      '00000000-0000-4000-8000-000000000301',
      (SELECT company_b FROM isolation_retest_ids),
      'FR',
      DATE '2026-05-01',
      DATE '2026-05-02'
    );
  EXCEPTION WHEN others THEN
    failed := true;
  END;

  IF failed IS NOT TRUE THEN
    RAISE EXCEPTION 'forged company_id trip INSERT did not fail for authenticated user';
  END IF;
END
$$;

DO $$
DECLARE
  failed boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.trips (
      employee_id,
      company_id,
      country,
      entry_date,
      exit_date
    )
    VALUES (
      '00000000-0000-4000-8000-000000000302',
      (SELECT company_a FROM isolation_retest_ids),
      'FR',
      DATE '2026-05-03',
      DATE '2026-05-04'
    );
  EXCEPTION WHEN others THEN
    failed := true;
  END;

  IF failed IS NOT TRUE THEN
    RAISE EXCEPTION 'cross-tenant employee/company trip INSERT did not fail for authenticated user';
  END IF;
END
$$;

DO $$
DECLARE
  failed boolean := false;
BEGIN
  BEGIN
    PERFORM count(*) FROM public.waitlist;
  EXCEPTION WHEN others THEN
    failed := true;
  END;

  IF failed IS NOT TRUE THEN
    RAISE EXCEPTION 'waitlist SELECT did not fail for authenticated user';
  END IF;
END
$$;

RESET ROLE;

SET LOCAL ROLE service_role;

DO $$
DECLARE
  failed boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.trips (
      employee_id,
      company_id,
      country,
      entry_date,
      exit_date
    )
    VALUES (
      '00000000-0000-4000-8000-000000000302',
      (SELECT company_a FROM isolation_retest_ids),
      'DE',
      DATE '2026-05-05',
      DATE '2026-05-06'
    );
  EXCEPTION WHEN others THEN
    failed := true;
  END;

  IF failed IS NOT TRUE THEN
    RAISE EXCEPTION 'service_role cross-tenant trip INSERT bypassed composite FK';
  END IF;
END
$$;

INSERT INTO public.trips (
  id,
  employee_id,
  company_id,
  country,
  entry_date,
  exit_date
)
VALUES (
  '00000000-0000-4000-8000-000000000501',
  '00000000-0000-4000-8000-000000000301',
  (SELECT company_a FROM isolation_retest_ids),
  'NL',
  DATE '2026-05-07',
  DATE '2026-05-08'
);

DO $$
DECLARE
  failed boolean := false;
BEGIN
  BEGIN
    UPDATE public.trips
    SET employee_id = '00000000-0000-4000-8000-000000000302'
    WHERE id = '00000000-0000-4000-8000-000000000501';
  EXCEPTION WHEN others THEN
    failed := true;
  END;

  IF failed IS NOT TRUE THEN
    RAISE EXCEPTION 'service_role cross-tenant trip UPDATE bypassed composite FK';
  END IF;
END
$$;

DO $$
DECLARE
  failed boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.alerts (
      employee_id,
      company_id,
      risk_level,
      message,
      alert_type,
      days_used
    )
    VALUES (
      '00000000-0000-4000-8000-000000000302',
      (SELECT company_a FROM isolation_retest_ids),
      'amber',
      'Cross-tenant alert must fail',
      'warning',
      70
    );
  EXCEPTION WHEN others THEN
    failed := true;
  END;

  IF failed IS NOT TRUE THEN
    RAISE EXCEPTION 'service_role cross-tenant alert INSERT bypassed composite FK';
  END IF;
END
$$;

DO $$
DECLARE
  failed boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.employee_compliance_snapshots (
      employee_id,
      company_id,
      days_used,
      days_remaining,
      risk_level
    )
    VALUES (
      '00000000-0000-4000-8000-000000000302',
      (SELECT company_a FROM isolation_retest_ids),
      10,
      80,
      'green'
    );
  EXCEPTION WHEN others THEN
    failed := true;
  END;

  IF failed IS NOT TRUE THEN
    RAISE EXCEPTION 'service_role cross-tenant snapshot INSERT bypassed composite FK';
  END IF;
END
$$;

RESET ROLE;

UPDATE public.company_entitlements
SET is_suspended = true,
    suspended_at = now(),
    suspended_reason = 'isolation retest'
WHERE company_id = (SELECT company_a FROM isolation_retest_ids);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000201', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  visible_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows
  FROM public.employees
  WHERE company_id = (SELECT company_a FROM isolation_retest_ids);

  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'suspended tenant can still read employees';
  END IF;
END
$$;

DO $$
DECLARE
  failed boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.trips (
      employee_id,
      company_id,
      country,
      entry_date,
      exit_date
    )
    VALUES (
      '00000000-0000-4000-8000-000000000301',
      (SELECT company_a FROM isolation_retest_ids),
      'ES',
      DATE '2026-05-09',
      DATE '2026-05-10'
    );
  EXCEPTION WHEN others THEN
    failed := true;
  END;

  IF failed IS NOT TRUE THEN
    RAISE EXCEPTION 'suspended tenant can still insert trips';
  END IF;
END
$$;

RESET ROLE;

DO $$
DECLARE
  audit_action text;
BEGIN
  SELECT action INTO audit_action
  FROM public.audit_log
  WHERE id = '00000000-0000-4000-8000-000000000401';

  IF audit_action <> 'isolation.retest.created' THEN
    RAISE EXCEPTION 'audit_log row was modified despite append-only controls';
  END IF;
END
$$;

SELECT 'multi_tenant_isolation_retest_passed' AS result;

ROLLBACK;
