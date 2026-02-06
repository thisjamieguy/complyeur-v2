


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."create_company_and_profile"("user_id" "uuid", "user_email" "text", "company_name" "text", "user_terms_accepted_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "user_auth_provider" "text" DEFAULT 'email'::"text", "user_first_name" "text" DEFAULT NULL::"text", "user_last_name" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
DECLARE
  new_company_id UUID;
  company_slug TEXT;
BEGIN
  -- Check if profile already exists (idempotency check)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    -- Return existing company_id
    SELECT company_id INTO new_company_id FROM public.profiles WHERE id = user_id;
    RETURN new_company_id;
  END IF;

  -- Generate a slug from company name
  company_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9]+', '-', 'g'));
  company_slug := regexp_replace(company_slug, '^-|-$', '', 'g');

  -- Ensure slug is not empty
  IF company_slug = '' OR company_slug IS NULL THEN
    company_slug := 'company';
  END IF;

  -- Ensure slug uniqueness by appending random suffix if needed
  WHILE EXISTS (SELECT 1 FROM public.companies WHERE slug = company_slug) LOOP
    company_slug := company_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
  END LOOP;

  -- Create the company
  INSERT INTO public.companies (name, slug)
  VALUES (company_name, company_slug)
  RETURNING id INTO new_company_id;

  -- Create the user profile with admin role
  INSERT INTO public.profiles (
    id,
    company_id,
    email,
    role,
    terms_accepted_at,
    auth_provider,
    first_name,
    last_name
  )
  VALUES (
    user_id,
    new_company_id,
    user_email,
    'admin',
    COALESCE(user_terms_accepted_at, NOW()),
    COALESCE(user_auth_provider, 'email'),
    user_first_name,
    user_last_name
  );

  RETURN new_company_id;
END;
$_$;


ALTER FUNCTION "public"."create_company_and_profile"("user_id" "uuid", "user_email" "text", "company_name" "text", "user_terms_accepted_at" timestamp with time zone, "user_auth_provider" "text", "user_first_name" "text", "user_last_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_company_and_profile"("user_id" "uuid", "user_email" "text", "company_name" "text", "user_terms_accepted_at" timestamp with time zone, "user_auth_provider" "text", "user_first_name" "text", "user_last_name" "text") IS 'Creates company and links user profile. SECURITY DEFINER with search_path locked.';



CREATE OR REPLACE FUNCTION "public"."create_default_company_entitlements"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.company_entitlements (company_id, tier_slug, is_trial, trial_ends_at)
  VALUES (NEW.id, 'free', true, NOW() + INTERVAL '14 days')
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_company_entitlements"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_default_company_entitlements"() IS 'Trigger: Creates default entitlements for new companies. SECURITY DEFINER with search_path locked.';



CREATE OR REPLACE FUNCTION "public"."get_current_user_company_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT company_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1
$$;


ALTER FUNCTION "public"."get_current_user_company_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_current_user_company_id"() IS 'Returns company_id for authenticated user. SECURITY DEFINER with search_path locked.';



CREATE OR REPLACE FUNCTION "public"."get_current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT auth.uid()
$$;


ALTER FUNCTION "public"."get_current_user_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_current_user_id"() IS 'Returns the current authenticated user ID. Wrapped for RLS caching optimization.';



CREATE OR REPLACE FUNCTION "public"."get_current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1
$$;


ALTER FUNCTION "public"."get_current_user_role"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_current_user_role"() IS 'Returns the role of the current user. SECURITY DEFINER bypasses RLS to prevent recursion.';



CREATE OR REPLACE FUNCTION "public"."get_dashboard_summary"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  result JSON;
  user_company_id UUID;
BEGIN
  -- SECURITY: Get company_id from the authenticated user's profile
  -- This prevents users from querying other companies' data
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = auth.uid();

  -- If user has no profile or no company, return empty result
  IF user_company_id IS NULL THEN
    RETURN json_build_object(
      'total_employees', 0,
      'at_risk_count', 0,
      'non_compliant_count', 0,
      'missing_snapshots', 0,
      'recent_trips', '[]'::json,
      'error', 'No company found for user'
    );
  END IF;

  SELECT json_build_object(
    'total_employees', (
      SELECT COUNT(*)
      FROM public.employees
      WHERE company_id = user_company_id
        AND deleted_at IS NULL
    ),
    'at_risk_count', (
      SELECT COUNT(*)
      FROM public.employee_compliance_snapshots ecs
      WHERE ecs.company_id = user_company_id
        AND ecs.risk_level IN ('amber', 'red')
    ),
    'non_compliant_count', (
      SELECT COUNT(*)
      FROM public.employee_compliance_snapshots ecs
      WHERE ecs.company_id = user_company_id
        AND ecs.is_compliant = false
    ),
    'missing_snapshots', (
      SELECT COUNT(*)
      FROM public.employees e
      LEFT JOIN public.employee_compliance_snapshots ecs ON e.id = ecs.employee_id
      WHERE e.company_id = user_company_id
        AND e.deleted_at IS NULL
        AND ecs.id IS NULL
    ),
    'recent_trips', (
      SELECT COALESCE(json_agg(t), '[]'::json)
      FROM (
        SELECT
          t.id,
          t.employee_id,
          e.name as employee_name,
          t.country,
          t.entry_date,
          t.exit_date,
          t.travel_days
        FROM public.trips t
        JOIN public.employees e ON e.id = t.employee_id
        WHERE e.company_id = user_company_id
          AND e.deleted_at IS NULL
          AND t.ghosted = false
        ORDER BY t.entry_date DESC
        LIMIT 5
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_dashboard_summary"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_dashboard_summary"() IS 'Returns dashboard summary for authenticated user company. SECURITY DEFINER with search_path locked.';



CREATE OR REPLACE FUNCTION "public"."get_last_audit_hash"("p_company_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  last_hash TEXT;
BEGIN
  SELECT entry_hash INTO last_hash
  FROM public.audit_log
  WHERE company_id = p_company_id
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN COALESCE(last_hash, 'GENESIS');
END;
$$;


ALTER FUNCTION "public"."get_last_audit_hash"("p_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_last_audit_hash"("p_company_id" "uuid") IS 'Returns last audit log hash for integrity chain. SECURITY DEFINER with search_path locked.';



CREATE OR REPLACE FUNCTION "public"."handle_auth_user_if_needed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_provider TEXT;
  user_email TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
  inferred_company_name TEXT;
  email_domain TEXT;
BEGIN
  -- If profile already exists, exit (idempotent)
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  user_provider := NEW.raw_app_meta_data->>'provider';
  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '');

  -- Prefer explicit company name from signup metadata
  inferred_company_name := NEW.raw_user_meta_data->>'company_name';

  -- Fall back to email domain if company name is missing
  IF inferred_company_name IS NULL OR inferred_company_name = '' THEN
    IF user_email LIKE '%@%' THEN
      email_domain := split_part(user_email, '@', 2);
      email_domain := split_part(email_domain, '.', 1);
      inferred_company_name := initcap(replace(replace(email_domain, '-', ' '), '_', ' '));
    ELSE
      inferred_company_name := 'My Company';
    END IF;
  END IF;

  IF inferred_company_name IS NULL OR inferred_company_name = '' THEN
    inferred_company_name := 'My Company';
  END IF;

  -- Extract user names if provided by OAuth
  user_first_name := NEW.raw_user_meta_data->>'given_name';
  user_last_name := NEW.raw_user_meta_data->>'family_name';
  IF user_first_name IS NULL AND user_last_name IS NULL THEN
    user_first_name := NEW.raw_user_meta_data->>'full_name';
  END IF;

  -- Provision company + profile (idempotent in create_company_and_profile)
  PERFORM create_company_and_profile(
    NEW.id,
    user_email,
    inferred_company_name,
    NOW(),
    COALESCE(user_provider, 'email'),
    user_first_name,
    user_last_name
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_auth_user_if_needed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_oauth_user_if_needed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_provider TEXT;
  user_email TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
  inferred_company_name TEXT;
  email_domain TEXT;
BEGIN
  -- Only process OAuth users (not email/password)
  user_provider := NEW.raw_app_meta_data->>'provider';

  IF user_provider IS NULL OR user_provider = 'email' THEN
    RETURN NEW;
  END IF;

  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Extract user info from metadata
  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '');
  user_first_name := NEW.raw_user_meta_data->>'given_name';
  user_last_name := NEW.raw_user_meta_data->>'family_name';

  -- If no name from OAuth, try full_name
  IF user_first_name IS NULL AND user_last_name IS NULL THEN
    user_first_name := NEW.raw_user_meta_data->>'full_name';
  END IF;

  -- Infer company name from email domain
  IF user_email LIKE '%@%' THEN
    email_domain := split_part(user_email, '@', 2);
    email_domain := split_part(email_domain, '.', 1);
    -- Convert hyphens/underscores to spaces and capitalize first letter
    inferred_company_name := initcap(replace(replace(email_domain, '-', ' '), '_', ' '));
  ELSE
    inferred_company_name := 'My Company';
  END IF;

  -- Ensure we have a valid company name
  IF inferred_company_name IS NULL OR inferred_company_name = '' THEN
    inferred_company_name := 'My Company';
  END IF;

  -- Create company and profile
  PERFORM create_company_and_profile(
    NEW.id,
    user_email,
    inferred_company_name,
    NOW(),
    user_provider,
    user_first_name,
    user_last_name
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_oauth_user_if_needed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."invalidate_compliance_snapshot"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Delete the snapshot for the affected employee
  -- This triggers a recompute on next dashboard load
  DELETE FROM public.employee_compliance_snapshots
  WHERE employee_id = COALESCE(NEW.employee_id, OLD.employee_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."invalidate_compliance_snapshot"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."invalidate_compliance_snapshot"() IS 'Trigger: Invalidates compliance snapshot on trip changes. search_path locked.';



CREATE OR REPLACE FUNCTION "public"."prevent_admin_audit_log_modifications"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_log is append-only'
    USING ERRCODE = '42501';
END;
$$;


ALTER FUNCTION "public"."prevent_admin_audit_log_modifications"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prevent_admin_audit_log_modifications"() IS 'Trigger: Prevents UPDATE/DELETE on admin_audit_log. search_path locked.';



CREATE OR REPLACE FUNCTION "public"."prevent_audit_log_modifications"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only'
    USING ERRCODE = '42501';
END;
$$;


ALTER FUNCTION "public"."prevent_audit_log_modifications"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prevent_audit_log_modifications"() IS 'Trigger: Prevents UPDATE/DELETE on audit_log. search_path locked.';



CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unsubscribe_by_token"("token" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE notification_preferences
  SET
    receive_warning_emails = false,
    receive_urgent_emails = false,
    receive_breach_emails = false,
    unsubscribed_at = NOW(),
    updated_at = NOW()
  WHERE unsubscribe_token = token
    AND unsubscribed_at IS NULL;

  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."unsubscribe_by_token"("token" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unsubscribe_by_token"("token" "uuid") IS 'Allows users to unsubscribe from all emails via a token link (GDPR one-click unsubscribe)';



CREATE OR REPLACE FUNCTION "public"."update_column_mappings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_column_mappings_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_column_mappings_updated_at"() IS 'Trigger: Updates updated_at on column_mappings. search_path locked.';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_updated_at_column"() IS 'Trigger: Updates updated_at timestamp. search_path locked.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid",
    "target_company_id" "uuid",
    "target_user_id" "uuid",
    "action" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "details_before" "jsonb",
    "details_after" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "risk_level" "text" NOT NULL,
    "message" "text" NOT NULL,
    "resolved" boolean DEFAULT false,
    "email_sent" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    "alert_type" "text" NOT NULL,
    "days_used" integer,
    "acknowledged" boolean DEFAULT false,
    "acknowledged_at" timestamp with time zone,
    "acknowledged_by" "uuid",
    CONSTRAINT "alerts_alert_type_check" CHECK (("alert_type" = ANY (ARRAY['warning'::"text", 'urgent'::"text", 'breach'::"text"]))),
    CONSTRAINT "alerts_risk_level_check" CHECK (("risk_level" = ANY (ARRAY['green'::"text", 'amber'::"text", 'red'::"text"])))
);


ALTER TABLE "public"."alerts" OWNER TO "postgres";


COMMENT ON TABLE "public"."alerts" IS 'Compliance alerts generated when employees approach or exceed limits';



COMMENT ON COLUMN "public"."alerts"."id" IS 'Unique identifier for the alert';



COMMENT ON COLUMN "public"."alerts"."employee_id" IS 'Reference to the employee this alert concerns';



COMMENT ON COLUMN "public"."alerts"."company_id" IS 'Reference to the company (denormalized for query performance)';



COMMENT ON COLUMN "public"."alerts"."risk_level" IS 'Severity level: green (ok), amber (warning), red (critical)';



COMMENT ON COLUMN "public"."alerts"."message" IS 'Human-readable alert message';



COMMENT ON COLUMN "public"."alerts"."resolved" IS 'Whether the alert has been resolved/acknowledged';



COMMENT ON COLUMN "public"."alerts"."email_sent" IS 'Whether an email notification was sent for this alert';



COMMENT ON COLUMN "public"."alerts"."resolved_at" IS 'Timestamp when the alert was resolved';



COMMENT ON COLUMN "public"."alerts"."alert_type" IS 'Type of threshold crossed: warning, urgent, or breach';



COMMENT ON COLUMN "public"."alerts"."days_used" IS 'Number of days used in 180-day window when alert was created';



COMMENT ON COLUMN "public"."alerts"."acknowledged" IS 'Whether a user has acknowledged seeing this alert';



COMMENT ON COLUMN "public"."alerts"."acknowledged_at" IS 'Timestamp when the alert was acknowledged';



COMMENT ON COLUMN "public"."alerts"."acknowledged_by" IS 'User who acknowledged the alert';



CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "details" "jsonb",
    "ip_address" "inet",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "previous_hash" "text",
    "entry_hash" "text"
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_log" IS 'Audit trail of all actions performed in the system';



COMMENT ON COLUMN "public"."audit_log"."id" IS 'Unique identifier for the audit entry';



COMMENT ON COLUMN "public"."audit_log"."company_id" IS 'Reference to the company';



COMMENT ON COLUMN "public"."audit_log"."user_id" IS 'Reference to the user who performed the action (null if system)';



COMMENT ON COLUMN "public"."audit_log"."action" IS 'Action performed (e.g., trip.created, employee.deleted)';



COMMENT ON COLUMN "public"."audit_log"."entity_type" IS 'Type of entity affected (e.g., trip, employee)';



COMMENT ON COLUMN "public"."audit_log"."entity_id" IS 'ID of the affected entity';



COMMENT ON COLUMN "public"."audit_log"."details" IS 'JSON object with before/after state or additional context';



COMMENT ON COLUMN "public"."audit_log"."ip_address" IS 'IP address of the client (if available)';



COMMENT ON COLUMN "public"."audit_log"."previous_hash" IS 'Hash of the previous audit log entry for chain integrity';



COMMENT ON COLUMN "public"."audit_log"."entry_hash" IS 'SHA-256 hash of this entry for tamper detection';



CREATE TABLE IF NOT EXISTS "public"."background_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "job_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "progress_current" integer DEFAULT 0,
    "progress_total" integer,
    "progress_message" "text",
    "attempts" integer DEFAULT 0,
    "max_attempts" integer DEFAULT 3,
    "last_error" "text",
    "input_data" "jsonb",
    "output_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_by" "uuid",
    CONSTRAINT "background_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."background_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."background_jobs" IS 'Async job queue for heavy operations';



COMMENT ON COLUMN "public"."background_jobs"."job_type" IS 'Type of job: bulk_recalc, export_csv, export_pdf, import_excel, rebuild_snapshots';



COMMENT ON COLUMN "public"."background_jobs"."status" IS 'pending -> running -> completed/failed';



COMMENT ON COLUMN "public"."background_jobs"."input_data" IS 'JSON parameters for the job';



COMMENT ON COLUMN "public"."background_jobs"."output_data" IS 'JSON results (file URLs, counts, etc.)';



CREATE TABLE IF NOT EXISTS "public"."column_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "format" "text" NOT NULL,
    "mappings" "jsonb" NOT NULL,
    "times_used" integer DEFAULT 0 NOT NULL,
    "last_used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "column_mappings_format_check" CHECK (("format" = ANY (ARRAY['employees'::"text", 'trips'::"text", 'gantt'::"text"]))),
    CONSTRAINT "mappings_not_empty" CHECK ((("jsonb_typeof"("mappings") = 'object'::"text") AND ("mappings" <> '{}'::"jsonb")))
);


ALTER TABLE "public"."column_mappings" OWNER TO "postgres";


COMMENT ON TABLE "public"."column_mappings" IS 'Stores saved column mappings for import operations';



COMMENT ON COLUMN "public"."column_mappings"."name" IS 'User-friendly name for this mapping (e.g., "HR System Export")';



COMMENT ON COLUMN "public"."column_mappings"."description" IS 'Optional description of when to use this mapping';



COMMENT ON COLUMN "public"."column_mappings"."format" IS 'Import format this mapping applies to: employees, trips, or gantt';



COMMENT ON COLUMN "public"."column_mappings"."mappings" IS 'JSON object mapping source column names to target fields';



COMMENT ON COLUMN "public"."column_mappings"."times_used" IS 'Number of times this mapping has been applied';



COMMENT ON COLUMN "public"."column_mappings"."last_used_at" IS 'Timestamp of last usage';



CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_entitlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "tier_slug" "text" DEFAULT 'free'::"text",
    "max_employees" integer,
    "max_users" integer,
    "can_export_csv" boolean,
    "can_export_pdf" boolean,
    "can_forecast" boolean,
    "can_calendar" boolean,
    "can_bulk_import" boolean,
    "can_api_access" boolean,
    "can_sso" boolean,
    "can_audit_logs" boolean,
    "is_trial" boolean DEFAULT true,
    "trial_ends_at" timestamp with time zone DEFAULT ("now"() + '14 days'::interval),
    "is_suspended" boolean DEFAULT false,
    "suspended_at" timestamp with time zone,
    "suspended_reason" "text",
    "manual_override" boolean DEFAULT false,
    "override_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."company_entitlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "admin_user_id" "uuid",
    "note_content" "text" NOT NULL,
    "category" "text" DEFAULT 'general'::"text",
    "is_pinned" boolean DEFAULT false,
    "follow_up_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "company_notes_category_check" CHECK (("category" = ANY (ARRAY['general'::"text", 'support'::"text", 'billing'::"text", 'custom_deal'::"text", 'feature_request'::"text", 'bug_report'::"text", 'churn_risk'::"text", 'onboarding'::"text", 'upsell_opportunity'::"text"])))
);


ALTER TABLE "public"."company_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_settings" (
    "company_id" "uuid" NOT NULL,
    "retention_months" integer DEFAULT 36,
    "warning_threshold" integer DEFAULT 75,
    "critical_threshold" integer DEFAULT 85,
    "email_notifications" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "warning_email_enabled" boolean DEFAULT true,
    "urgent_email_enabled" boolean DEFAULT true,
    "breach_email_enabled" boolean DEFAULT true,
    "session_timeout_minutes" integer DEFAULT 30,
    "risk_threshold_green" integer DEFAULT 30,
    "risk_threshold_amber" integer DEFAULT 10,
    "future_job_warning_threshold" integer DEFAULT 80,
    "notify_70_days" boolean DEFAULT true,
    "notify_85_days" boolean DEFAULT true,
    "notify_90_days" boolean DEFAULT true,
    "weekly_digest" boolean DEFAULT false,
    "custom_alert_threshold" integer,
    CONSTRAINT "check_future_job_warning" CHECK ((("future_job_warning_threshold" >= 50) AND ("future_job_warning_threshold" <= 89))),
    CONSTRAINT "check_retention_months" CHECK ((("retention_months" >= 12) AND ("retention_months" <= 84))),
    CONSTRAINT "check_risk_threshold_amber" CHECK ((("risk_threshold_amber" >= 1) AND ("risk_threshold_amber" <= 88))),
    CONSTRAINT "check_risk_threshold_green" CHECK ((("risk_threshold_green" >= 1) AND ("risk_threshold_green" <= 89))),
    CONSTRAINT "check_session_timeout" CHECK ((("session_timeout_minutes" >= 5) AND ("session_timeout_minutes" <= 120))),
    CONSTRAINT "company_settings_custom_alert_threshold_check" CHECK ((("custom_alert_threshold" IS NULL) OR (("custom_alert_threshold" >= 60) AND ("custom_alert_threshold" <= 85)))),
    CONSTRAINT "company_settings_threshold_order" CHECK ((("warning_threshold" < "critical_threshold") AND ("critical_threshold" < 90))),
    CONSTRAINT "company_settings_threshold_ranges" CHECK ((("warning_threshold" >= 50) AND ("warning_threshold" <= 85) AND ("critical_threshold" >= 60) AND ("critical_threshold" <= 89)))
);


ALTER TABLE "public"."company_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_settings" IS 'Per-company configuration for compliance tracking';



COMMENT ON COLUMN "public"."company_settings"."company_id" IS 'Reference to the company (also serves as primary key)';



COMMENT ON COLUMN "public"."company_settings"."retention_months" IS 'How many months to retain trip data (GDPR compliance)';



COMMENT ON COLUMN "public"."company_settings"."warning_threshold" IS 'Days used that triggers warning alert (default 70, range 50-85)';



COMMENT ON COLUMN "public"."company_settings"."critical_threshold" IS 'Days used that triggers urgent alert (default 85, range 60-89)';



COMMENT ON COLUMN "public"."company_settings"."email_notifications" IS 'Master switch for all email notifications';



COMMENT ON COLUMN "public"."company_settings"."warning_email_enabled" IS 'Whether to send emails for warning alerts';



COMMENT ON COLUMN "public"."company_settings"."urgent_email_enabled" IS 'Whether to send emails for urgent alerts';



COMMENT ON COLUMN "public"."company_settings"."breach_email_enabled" IS 'Whether to send emails for breach alerts (strongly recommended)';



COMMENT ON COLUMN "public"."company_settings"."session_timeout_minutes" IS 'Minutes of inactivity before user is logged out (5-120)';



COMMENT ON COLUMN "public"."company_settings"."risk_threshold_green" IS 'Days remaining >= this value shows green status';



COMMENT ON COLUMN "public"."company_settings"."risk_threshold_amber" IS 'Days remaining >= this value shows amber status (below = red)';



COMMENT ON COLUMN "public"."company_settings"."future_job_warning_threshold" IS 'Days threshold for future job warnings (50-89)';



COMMENT ON COLUMN "public"."company_settings"."notify_70_days" IS 'Send email when employee reaches 70 days used';



COMMENT ON COLUMN "public"."company_settings"."notify_85_days" IS 'Send email when employee reaches 85 days used';



COMMENT ON COLUMN "public"."company_settings"."notify_90_days" IS 'Send email when employee reaches 90 days (breach)';



COMMENT ON COLUMN "public"."company_settings"."weekly_digest" IS 'Send weekly summary email every Monday';



COMMENT ON COLUMN "public"."company_settings"."custom_alert_threshold" IS 'Optional custom threshold (60-85 days)';



CREATE TABLE IF NOT EXISTS "public"."employee_compliance_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "days_used" integer NOT NULL,
    "days_remaining" integer NOT NULL,
    "risk_level" "text" NOT NULL,
    "is_compliant" boolean DEFAULT true NOT NULL,
    "next_reset_date" "date",
    "snapshot_generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "trips_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "employee_compliance_snapshots_risk_level_check" CHECK (("risk_level" = ANY (ARRAY['green'::"text", 'amber'::"text", 'red'::"text"])))
);


ALTER TABLE "public"."employee_compliance_snapshots" OWNER TO "postgres";


COMMENT ON TABLE "public"."employee_compliance_snapshots" IS 'Precomputed compliance status for dashboard performance';



COMMENT ON COLUMN "public"."employee_compliance_snapshots"."days_used" IS 'Days used in current 180-day rolling window';



COMMENT ON COLUMN "public"."employee_compliance_snapshots"."days_remaining" IS '90 - days_used (can be negative if over limit)';



COMMENT ON COLUMN "public"."employee_compliance_snapshots"."risk_level" IS 'green (>=30), amber (10-29), red (<10 or over)';



COMMENT ON COLUMN "public"."employee_compliance_snapshots"."snapshot_generated_at" IS 'When this snapshot was computed';



COMMENT ON COLUMN "public"."employee_compliance_snapshots"."trips_hash" IS 'MD5 hash of trip data for cache validation';



CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "anonymized_at" timestamp with time zone,
    "email" "text"
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


COMMENT ON TABLE "public"."employees" IS 'Employee records for travel compliance tracking (GDPR minimized)';



COMMENT ON COLUMN "public"."employees"."id" IS 'Unique identifier for the employee';



COMMENT ON COLUMN "public"."employees"."company_id" IS 'Reference to the company this employee belongs to';



COMMENT ON COLUMN "public"."employees"."name" IS 'Employee name (only personal data stored per GDPR minimization)';



COMMENT ON COLUMN "public"."employees"."deleted_at" IS 'Soft delete timestamp - employee hidden from UI but recoverable for 30 days';



COMMENT ON COLUMN "public"."employees"."anonymized_at" IS 'Timestamp when employee was anonymized under GDPR right to erasure';



COMMENT ON COLUMN "public"."employees"."email" IS 'Employee email address for identification and trip import matching';



CREATE TABLE IF NOT EXISTS "public"."trips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "country" "text" NOT NULL,
    "entry_date" "date" NOT NULL,
    "exit_date" "date" NOT NULL,
    "purpose" "text",
    "job_ref" "text",
    "is_private" boolean DEFAULT false,
    "ghosted" boolean DEFAULT false,
    "travel_days" integer GENERATED ALWAYS AS ((("exit_date" - "entry_date") + 1)) STORED,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "trips_country_code_length" CHECK (("char_length"("country") = 2)),
    CONSTRAINT "trips_exit_after_entry" CHECK (("exit_date" >= "entry_date"))
);


ALTER TABLE "public"."trips" OWNER TO "postgres";


COMMENT ON TABLE "public"."trips" IS 'Travel records for Schengen compliance tracking';



COMMENT ON COLUMN "public"."trips"."id" IS 'Unique identifier for the trip';



COMMENT ON COLUMN "public"."trips"."employee_id" IS 'Reference to the employee who took this trip';



COMMENT ON COLUMN "public"."trips"."company_id" IS 'Reference to the company (denormalized for query performance)';



COMMENT ON COLUMN "public"."trips"."country" IS '2-letter ISO country code for the destination';



COMMENT ON COLUMN "public"."trips"."entry_date" IS 'Date of entry into the Schengen area';



COMMENT ON COLUMN "public"."trips"."exit_date" IS 'Date of exit from the Schengen area';



COMMENT ON COLUMN "public"."trips"."purpose" IS 'Optional description of trip purpose';



COMMENT ON COLUMN "public"."trips"."job_ref" IS 'Optional job or project reference';



COMMENT ON COLUMN "public"."trips"."is_private" IS 'Whether this is a private (non-business) trip';



COMMENT ON COLUMN "public"."trips"."ghosted" IS 'If true, exclude this trip from compliance calculations';



COMMENT ON COLUMN "public"."trips"."travel_days" IS 'Auto-calculated number of days (inclusive)';



CREATE OR REPLACE VIEW "public"."employee_compliance_summary" WITH ("security_invoker"='true') AS
 SELECT "e"."id" AS "employee_id",
    "e"."name" AS "employee_name",
    "e"."company_id",
    "count"("t"."id") AS "total_trips",
    COALESCE("sum"(
        CASE
            WHEN ("t"."ghosted" = false) THEN "t"."travel_days"
            ELSE 0
        END), (0)::bigint) AS "total_travel_days",
    "max"("t"."exit_date") AS "last_trip_end"
   FROM ("public"."employees" "e"
     LEFT JOIN "public"."trips" "t" ON (("t"."employee_id" = "e"."id")))
  GROUP BY "e"."id", "e"."name", "e"."company_id";


ALTER VIEW "public"."employee_compliance_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."employee_compliance_summary" IS 'Summary view for employee compliance dashboards. Uses SECURITY INVOKER to respect RLS policies on employees and trips tables.';



CREATE TABLE IF NOT EXISTS "public"."import_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "format" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "total_rows" integer DEFAULT 0,
    "valid_rows" integer DEFAULT 0,
    "error_rows" integer DEFAULT 0,
    "parsed_data" "jsonb",
    "validation_errors" "jsonb" DEFAULT '[]'::"jsonb",
    "result" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "import_sessions_file_size_check" CHECK ((("file_size" > 0) AND ("file_size" <= 10485760))),
    CONSTRAINT "import_sessions_format_check" CHECK (("format" = ANY (ARRAY['employees'::"text", 'trips'::"text", 'gantt'::"text"]))),
    CONSTRAINT "import_sessions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'parsing'::"text", 'validating'::"text", 'ready'::"text", 'importing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."import_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."import_sessions" IS 'Tracks data import operations for employees and trips';



COMMENT ON COLUMN "public"."import_sessions"."format" IS 'Type of import: employees, trips, or gantt';



COMMENT ON COLUMN "public"."import_sessions"."status" IS 'Current state of the import process';



COMMENT ON COLUMN "public"."import_sessions"."parsed_data" IS 'JSON array of parsed row data';



COMMENT ON COLUMN "public"."import_sessions"."validation_errors" IS 'JSON array of validation errors/warnings';



COMMENT ON COLUMN "public"."import_sessions"."result" IS 'Final import results (counts, errors)';



CREATE TABLE IF NOT EXISTS "public"."mfa_backup_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "code_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "used_at" timestamp with time zone
);


ALTER TABLE "public"."mfa_backup_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mfa_backup_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."mfa_backup_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "alert_id" "uuid",
    "employee_id" "uuid",
    "notification_type" "text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "resend_message_id" "text",
    "error_message" "text",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notification_log_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text", 'bounced'::"text"]))),
    CONSTRAINT "notification_log_type_check" CHECK (("notification_type" = ANY (ARRAY['warning'::"text", 'urgent'::"text", 'breach'::"text", 'resolution'::"text"])))
);


ALTER TABLE "public"."notification_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_log" IS 'Audit log of all email notifications sent for compliance alerts';



COMMENT ON COLUMN "public"."notification_log"."id" IS 'Unique identifier for the notification log entry';



COMMENT ON COLUMN "public"."notification_log"."company_id" IS 'Reference to the company';



COMMENT ON COLUMN "public"."notification_log"."alert_id" IS 'Reference to the alert that triggered this notification';



COMMENT ON COLUMN "public"."notification_log"."employee_id" IS 'Reference to the employee this notification concerns';



COMMENT ON COLUMN "public"."notification_log"."notification_type" IS 'Type of notification: warning, urgent, breach, or resolution';



COMMENT ON COLUMN "public"."notification_log"."recipient_email" IS 'Email address the notification was sent to';



COMMENT ON COLUMN "public"."notification_log"."subject" IS 'Email subject line';



COMMENT ON COLUMN "public"."notification_log"."status" IS 'Delivery status: pending, sent, failed, or bounced';



COMMENT ON COLUMN "public"."notification_log"."resend_message_id" IS 'Message ID from Resend for tracking';



COMMENT ON COLUMN "public"."notification_log"."error_message" IS 'Error message if delivery failed';



COMMENT ON COLUMN "public"."notification_log"."sent_at" IS 'Timestamp when the email was actually sent';



CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "receive_warning_emails" boolean DEFAULT true,
    "receive_urgent_emails" boolean DEFAULT true,
    "receive_breach_emails" boolean DEFAULT true,
    "unsubscribe_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "unsubscribed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_preferences" IS 'Per-user email notification preferences';



COMMENT ON COLUMN "public"."notification_preferences"."user_id" IS 'Reference to the user';



COMMENT ON COLUMN "public"."notification_preferences"."company_id" IS 'Reference to the company';



COMMENT ON COLUMN "public"."notification_preferences"."receive_warning_emails" IS 'Whether user wants warning emails';



COMMENT ON COLUMN "public"."notification_preferences"."receive_urgent_emails" IS 'Whether user wants urgent emails';



COMMENT ON COLUMN "public"."notification_preferences"."receive_breach_emails" IS 'Whether user wants breach emails';



COMMENT ON COLUMN "public"."notification_preferences"."unsubscribe_token" IS 'Token for one-click unsubscribe (GDPR)';



COMMENT ON COLUMN "public"."notification_preferences"."unsubscribed_at" IS 'If set, user has fully unsubscribed';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "terms_accepted_at" timestamp with time zone,
    "is_superadmin" boolean DEFAULT false,
    "auth_provider" "text" DEFAULT 'email'::"text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."terms_accepted_at" IS 'Timestamp when user accepted Terms of Service and Privacy Policy';



COMMENT ON COLUMN "public"."profiles"."auth_provider" IS 'Authentication provider used for signup: email, google, etc.';



CREATE TABLE IF NOT EXISTS "public"."schengen_countries" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "is_full_member" boolean DEFAULT true,
    "notes" "text"
);


ALTER TABLE "public"."schengen_countries" OWNER TO "postgres";


COMMENT ON TABLE "public"."schengen_countries" IS 'Reference table of Schengen Area countries for travel tracking';



COMMENT ON COLUMN "public"."schengen_countries"."code" IS '2-letter ISO 3166-1 alpha-2 country code';



COMMENT ON COLUMN "public"."schengen_countries"."name" IS 'Full country name in English';



COMMENT ON COLUMN "public"."schengen_countries"."is_full_member" IS 'Whether the country is a full Schengen member (vs associated)';



COMMENT ON COLUMN "public"."schengen_countries"."notes" IS 'Additional notes about the country''s Schengen status';



CREATE TABLE IF NOT EXISTS "public"."tiers" (
    "slug" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "max_employees" integer DEFAULT 10 NOT NULL,
    "max_users" integer DEFAULT 2 NOT NULL,
    "can_export_csv" boolean DEFAULT false,
    "can_export_pdf" boolean DEFAULT false,
    "can_forecast" boolean DEFAULT false,
    "can_calendar" boolean DEFAULT false,
    "can_bulk_import" boolean DEFAULT false,
    "can_api_access" boolean DEFAULT false,
    "can_sso" boolean DEFAULT false,
    "can_audit_logs" boolean DEFAULT false,
    "stripe_price_id_monthly" "text",
    "stripe_price_id_annual" "text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."waitlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "company_name" "text",
    "source" "text" DEFAULT 'landing'::"text",
    CONSTRAINT "waitlist_email_format" CHECK (("email" ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::"text")),
    CONSTRAINT "waitlist_source_values" CHECK ((("source" IS NULL) OR ("source" = ANY (ARRAY['landing'::"text", 'referral'::"text", 'direct'::"text", 'demo'::"text"]))))
);


ALTER TABLE "public"."waitlist" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."background_jobs"
    ADD CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."column_mappings"
    ADD CONSTRAINT "column_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."company_entitlements"
    ADD CONSTRAINT "company_entitlements_company_id_key" UNIQUE ("company_id");



ALTER TABLE ONLY "public"."company_entitlements"
    ADD CONSTRAINT "company_entitlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_notes"
    ADD CONSTRAINT "company_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_pkey" PRIMARY KEY ("company_id");



ALTER TABLE ONLY "public"."employee_compliance_snapshots"
    ADD CONSTRAINT "employee_compliance_snapshots_employee_id_key" UNIQUE ("employee_id");



ALTER TABLE ONLY "public"."employee_compliance_snapshots"
    ADD CONSTRAINT "employee_compliance_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."import_sessions"
    ADD CONSTRAINT "import_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mfa_backup_codes"
    ADD CONSTRAINT "mfa_backup_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mfa_backup_sessions"
    ADD CONSTRAINT "mfa_backup_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schengen_countries"
    ADD CONSTRAINT "schengen_countries_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."tiers"
    ADD CONSTRAINT "tiers_pkey" PRIMARY KEY ("slug");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_admin_audit_action" ON "public"."admin_audit_log" USING "btree" ("action");



CREATE INDEX "idx_admin_audit_admin" ON "public"."admin_audit_log" USING "btree" ("admin_user_id");



CREATE INDEX "idx_admin_audit_company" ON "public"."admin_audit_log" USING "btree" ("target_company_id");



CREATE INDEX "idx_admin_audit_created" ON "public"."admin_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_alerts_company_id" ON "public"."alerts" USING "btree" ("company_id");



CREATE INDEX "idx_alerts_company_unacknowledged" ON "public"."alerts" USING "btree" ("company_id", "acknowledged") WHERE ("acknowledged" = false);



CREATE INDEX "idx_alerts_company_unresolved" ON "public"."alerts" USING "btree" ("company_id", "created_at" DESC) WHERE ("resolved" = false);



COMMENT ON INDEX "public"."idx_alerts_company_unresolved" IS 'Partial index for alert banner - only unresolved alerts';



CREATE INDEX "idx_alerts_employee_id" ON "public"."alerts" USING "btree" ("employee_id");



CREATE INDEX "idx_alerts_employee_resolved" ON "public"."alerts" USING "btree" ("employee_id", "resolved");



CREATE UNIQUE INDEX "idx_alerts_employee_type_active" ON "public"."alerts" USING "btree" ("employee_id", "alert_type") WHERE ("resolved" = false);



CREATE INDEX "idx_audit_log_action" ON "public"."audit_log" USING "btree" ("action");



CREATE INDEX "idx_audit_log_company_id" ON "public"."audit_log" USING "btree" ("company_id");



CREATE INDEX "idx_audit_log_company_recent" ON "public"."audit_log" USING "btree" ("company_id", "created_at" DESC);



CREATE INDEX "idx_audit_log_created_at" ON "public"."audit_log" USING "btree" ("created_at");



CREATE INDEX "idx_audit_log_entry_hash" ON "public"."audit_log" USING "btree" ("entry_hash");



CREATE INDEX "idx_audit_log_user_id" ON "public"."audit_log" USING "btree" ("user_id");



CREATE INDEX "idx_column_mappings_company" ON "public"."column_mappings" USING "btree" ("company_id");



CREATE INDEX "idx_column_mappings_created" ON "public"."column_mappings" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_column_mappings_format" ON "public"."column_mappings" USING "btree" ("format");



CREATE INDEX "idx_companies_slug" ON "public"."companies" USING "btree" ("slug");



CREATE INDEX "idx_employees_anonymized_at" ON "public"."employees" USING "btree" ("anonymized_at") WHERE ("anonymized_at" IS NOT NULL);



CREATE UNIQUE INDEX "idx_employees_company_email" ON "public"."employees" USING "btree" ("company_id", "lower"("email")) WHERE ("email" IS NOT NULL);



CREATE INDEX "idx_employees_company_id" ON "public"."employees" USING "btree" ("company_id");



CREATE INDEX "idx_employees_company_not_deleted" ON "public"."employees" USING "btree" ("company_id", "name") WHERE ("deleted_at" IS NULL);



COMMENT ON INDEX "public"."idx_employees_company_not_deleted" IS 'Partial index for dashboard - only active employees';



CREATE INDEX "idx_employees_deleted_at" ON "public"."employees" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



CREATE INDEX "idx_employees_email_lower" ON "public"."employees" USING "btree" ("lower"("email"));



CREATE INDEX "idx_employees_name" ON "public"."employees" USING "btree" ("name");



CREATE INDEX "idx_entitlements_company" ON "public"."company_entitlements" USING "btree" ("company_id");



CREATE INDEX "idx_entitlements_suspended" ON "public"."company_entitlements" USING "btree" ("is_suspended") WHERE ("is_suspended" = true);



CREATE INDEX "idx_entitlements_tier" ON "public"."company_entitlements" USING "btree" ("tier_slug");



CREATE INDEX "idx_entitlements_trial" ON "public"."company_entitlements" USING "btree" ("trial_ends_at") WHERE ("is_trial" = true);



CREATE INDEX "idx_import_sessions_company" ON "public"."import_sessions" USING "btree" ("company_id");



CREATE INDEX "idx_import_sessions_created" ON "public"."import_sessions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_import_sessions_status" ON "public"."import_sessions" USING "btree" ("status");



CREATE INDEX "idx_import_sessions_user" ON "public"."import_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_jobs_company" ON "public"."background_jobs" USING "btree" ("company_id");



CREATE INDEX "idx_jobs_created" ON "public"."background_jobs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_jobs_status" ON "public"."background_jobs" USING "btree" ("status") WHERE ("status" = ANY (ARRAY['pending'::"text", 'running'::"text"]));



CREATE INDEX "idx_jobs_type_status" ON "public"."background_jobs" USING "btree" ("job_type", "status");



CREATE UNIQUE INDEX "idx_mfa_backup_codes_user_hash" ON "public"."mfa_backup_codes" USING "btree" ("user_id", "code_hash");



CREATE INDEX "idx_mfa_backup_codes_user_unused" ON "public"."mfa_backup_codes" USING "btree" ("user_id") WHERE ("used_at" IS NULL);



CREATE UNIQUE INDEX "idx_mfa_backup_sessions_hash" ON "public"."mfa_backup_sessions" USING "btree" ("session_hash");



CREATE INDEX "idx_mfa_backup_sessions_user" ON "public"."mfa_backup_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_notes_company" ON "public"."company_notes" USING "btree" ("company_id");



CREATE INDEX "idx_notes_follow_up" ON "public"."company_notes" USING "btree" ("follow_up_date") WHERE ("follow_up_date" IS NOT NULL);



CREATE INDEX "idx_notes_pinned" ON "public"."company_notes" USING "btree" ("company_id", "is_pinned") WHERE ("is_pinned" = true);



CREATE INDEX "idx_notification_log_alert_id" ON "public"."notification_log" USING "btree" ("alert_id");



CREATE INDEX "idx_notification_log_company_id" ON "public"."notification_log" USING "btree" ("company_id");



CREATE INDEX "idx_notification_log_created_at" ON "public"."notification_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notification_log_employee_id" ON "public"."notification_log" USING "btree" ("employee_id");



CREATE INDEX "idx_notification_log_status" ON "public"."notification_log" USING "btree" ("status");



CREATE INDEX "idx_notification_preferences_company_id" ON "public"."notification_preferences" USING "btree" ("company_id");



CREATE UNIQUE INDEX "idx_notification_preferences_unsubscribe_token" ON "public"."notification_preferences" USING "btree" ("unsubscribe_token");



CREATE INDEX "idx_notification_preferences_user_id" ON "public"."notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_auth_provider" ON "public"."profiles" USING "btree" ("auth_provider");



CREATE INDEX "idx_profiles_company_id" ON "public"."profiles" USING "btree" ("company_id");



CREATE INDEX "idx_profiles_id" ON "public"."profiles" USING "btree" ("id");



CREATE INDEX "idx_profiles_superadmin" ON "public"."profiles" USING "btree" ("is_superadmin") WHERE ("is_superadmin" = true);



CREATE INDEX "idx_snapshots_company" ON "public"."employee_compliance_snapshots" USING "btree" ("company_id");



CREATE INDEX "idx_snapshots_generated" ON "public"."employee_compliance_snapshots" USING "btree" ("snapshot_generated_at");



CREATE INDEX "idx_snapshots_risk" ON "public"."employee_compliance_snapshots" USING "btree" ("risk_level");



CREATE INDEX "idx_trips_company_id" ON "public"."trips" USING "btree" ("company_id");



CREATE INDEX "idx_trips_employee_company" ON "public"."trips" USING "btree" ("employee_id", "company_id");



CREATE INDEX "idx_trips_employee_date_range" ON "public"."trips" USING "btree" ("employee_id", "entry_date", "exit_date");



CREATE INDEX "idx_trips_employee_id" ON "public"."trips" USING "btree" ("employee_id");



CREATE INDEX "idx_trips_employee_not_ghosted" ON "public"."trips" USING "btree" ("employee_id", "entry_date" DESC, "exit_date" DESC) WHERE ("ghosted" = false);



COMMENT ON INDEX "public"."idx_trips_employee_not_ghosted" IS 'Partial index for compliance calculations - only non-ghosted trips';



CREATE INDEX "idx_trips_entry_date" ON "public"."trips" USING "btree" ("entry_date");



CREATE INDEX "idx_trips_exit_date" ON "public"."trips" USING "btree" ("exit_date");



CREATE OR REPLACE TRIGGER "create_company_entitlements_trigger" AFTER INSERT ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_company_entitlements"();



CREATE OR REPLACE TRIGGER "prevent_admin_audit_log_modifications" BEFORE DELETE OR UPDATE ON "public"."admin_audit_log" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_admin_audit_log_modifications"();



CREATE OR REPLACE TRIGGER "prevent_audit_log_modifications" BEFORE DELETE OR UPDATE ON "public"."audit_log" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_audit_log_modifications"();



CREATE OR REPLACE TRIGGER "trigger_column_mappings_updated_at" BEFORE UPDATE ON "public"."column_mappings" FOR EACH ROW EXECUTE FUNCTION "public"."update_column_mappings_updated_at"();



CREATE OR REPLACE TRIGGER "trip_invalidates_snapshot" AFTER INSERT OR DELETE OR UPDATE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."invalidate_compliance_snapshot"();



CREATE OR REPLACE TRIGGER "update_companies_updated_at" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_company_entitlements_updated_at" BEFORE UPDATE ON "public"."company_entitlements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_company_notes_updated_at" BEFORE UPDATE ON "public"."company_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_company_settings_updated_at" BEFORE UPDATE ON "public"."company_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employees_updated_at" BEFORE UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notification_preferences_updated_at" BEFORE UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_snapshots_updated_at" BEFORE UPDATE ON "public"."employee_compliance_snapshots" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tiers_updated_at" BEFORE UPDATE ON "public"."tiers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_trips_updated_at" BEFORE UPDATE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_target_company_id_fkey" FOREIGN KEY ("target_company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."background_jobs"
    ADD CONSTRAINT "background_jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."background_jobs"
    ADD CONSTRAINT "background_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."column_mappings"
    ADD CONSTRAINT "column_mappings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."column_mappings"
    ADD CONSTRAINT "column_mappings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_entitlements"
    ADD CONSTRAINT "company_entitlements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_entitlements"
    ADD CONSTRAINT "company_entitlements_tier_slug_fkey" FOREIGN KEY ("tier_slug") REFERENCES "public"."tiers"("slug");



ALTER TABLE ONLY "public"."company_notes"
    ADD CONSTRAINT "company_notes_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."company_notes"
    ADD CONSTRAINT "company_notes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_compliance_snapshots"
    ADD CONSTRAINT "employee_compliance_snapshots_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_compliance_snapshots"
    ADD CONSTRAINT "employee_compliance_snapshots_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."import_sessions"
    ADD CONSTRAINT "import_sessions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."import_sessions"
    ADD CONSTRAINT "import_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mfa_backup_codes"
    ADD CONSTRAINT "mfa_backup_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mfa_backup_sessions"
    ADD CONSTRAINT "mfa_backup_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can view deleted employees in their company" ON "public"."employees" FOR SELECT USING ((("company_id" = "public"."get_current_user_company_id"()) AND ("deleted_at" IS NOT NULL) AND ("public"."get_current_user_role"() = 'admin'::"text")));



CREATE POLICY "Allow anonymous waitlist insert with validation" ON "public"."waitlist" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("email" IS NOT NULL) AND ("length"("email") >= 5) AND ("length"("email") <= 255) AND ("email" ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::"text") AND (("source" IS NULL) OR ("source" = ANY (ARRAY['landing'::"text", 'referral'::"text", 'direct'::"text", 'demo'::"text"]))) AND (("company_name" IS NULL) OR ("length"("company_name") <= 200))));



COMMENT ON POLICY "Allow anonymous waitlist insert with validation" ON "public"."waitlist" IS 'Allows public waitlist signups with email format validation and field constraints. Replaces permissive WITH CHECK (true) policy.';



CREATE POLICY "Allow authenticated read waitlist" ON "public"."waitlist" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone can view tiers" ON "public"."tiers" FOR SELECT USING (true);



CREATE POLICY "Deny delete on admin audit log" ON "public"."admin_audit_log" FOR DELETE USING (false);



CREATE POLICY "Deny delete on audit log" ON "public"."audit_log" FOR DELETE USING (false);



CREATE POLICY "Deny delete on company notes" ON "public"."company_notes" FOR DELETE USING (false);



CREATE POLICY "Deny deletes to entitlements" ON "public"."company_entitlements" FOR DELETE USING (false);



CREATE POLICY "Deny deletes to tiers" ON "public"."tiers" FOR DELETE USING (false);



CREATE POLICY "Deny insert on admin audit log" ON "public"."admin_audit_log" FOR INSERT WITH CHECK (false);



CREATE POLICY "Deny insert on company notes" ON "public"."company_notes" FOR INSERT WITH CHECK (false);



CREATE POLICY "Deny inserts to tiers" ON "public"."tiers" FOR INSERT WITH CHECK (false);



CREATE POLICY "Deny modifications to entitlements" ON "public"."company_entitlements" FOR INSERT WITH CHECK (false);



CREATE POLICY "Deny select on admin audit log" ON "public"."admin_audit_log" FOR SELECT USING (false);



CREATE POLICY "Deny select on company notes" ON "public"."company_notes" FOR SELECT USING (false);



CREATE POLICY "Deny update on admin audit log" ON "public"."admin_audit_log" FOR UPDATE USING (false) WITH CHECK (false);



CREATE POLICY "Deny update on audit log" ON "public"."audit_log" FOR UPDATE USING (false) WITH CHECK (false);



CREATE POLICY "Deny update on company notes" ON "public"."company_notes" FOR UPDATE USING (false) WITH CHECK (false);



CREATE POLICY "Deny updates to entitlements" ON "public"."company_entitlements" FOR UPDATE USING (false) WITH CHECK (false);



CREATE POLICY "Deny updates to tiers" ON "public"."tiers" FOR UPDATE USING (false) WITH CHECK (false);



CREATE POLICY "Users can delete alerts in their company" ON "public"."alerts" FOR DELETE USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can delete audit_log in their company" ON "public"."audit_log" FOR DELETE USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can delete background_jobs in their company" ON "public"."background_jobs" FOR DELETE USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can delete column_mappings in their company" ON "public"."column_mappings" FOR DELETE USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can delete company_settings in their company" ON "public"."company_settings" FOR DELETE USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can delete employee_compliance_snapshots in their company" ON "public"."employee_compliance_snapshots" FOR DELETE USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can delete employees in their company" ON "public"."employees" FOR DELETE USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can delete import_sessions in their company" ON "public"."import_sessions" FOR DELETE USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can delete notification_log in their company" ON "public"."notification_log" FOR DELETE USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can delete own MFA backup codes" ON "public"."mfa_backup_codes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own MFA backup sessions" ON "public"."mfa_backup_sessions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own notification preferences" ON "public"."notification_preferences" FOR DELETE USING (("user_id" = "public"."get_current_user_id"()));



CREATE POLICY "Users can delete trips in their company" ON "public"."trips" FOR DELETE USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can insert alerts in their company" ON "public"."alerts" FOR INSERT WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can insert audit_log in their company" ON "public"."audit_log" FOR INSERT WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can insert background_jobs in their company" ON "public"."background_jobs" FOR INSERT WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can insert column_mappings in their company" ON "public"."column_mappings" FOR INSERT WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can insert company_settings in their company" ON "public"."company_settings" FOR INSERT WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can insert employee_compliance_snapshots in their company" ON "public"."employee_compliance_snapshots" FOR INSERT WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can insert employees in their company" ON "public"."employees" FOR INSERT WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can insert import_sessions in their company" ON "public"."import_sessions" FOR INSERT WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can insert notification_log in their company" ON "public"."notification_log" FOR INSERT WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can insert own MFA backup codes" ON "public"."mfa_backup_codes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own MFA backup sessions" ON "public"."mfa_backup_sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own notification preferences" ON "public"."notification_preferences" FOR INSERT WITH CHECK (("user_id" = "public"."get_current_user_id"()));



CREATE POLICY "Users can insert trips in their company" ON "public"."trips" FOR INSERT WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can update alerts in their company" ON "public"."alerts" FOR UPDATE USING (("company_id" = "public"."get_current_user_company_id"())) WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can update audit_log in their company" ON "public"."audit_log" FOR UPDATE USING (("company_id" = "public"."get_current_user_company_id"())) WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can update background_jobs in their company" ON "public"."background_jobs" FOR UPDATE USING (("company_id" = "public"."get_current_user_company_id"())) WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can update column_mappings in their company" ON "public"."column_mappings" FOR UPDATE USING (("company_id" = "public"."get_current_user_company_id"())) WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can update company_settings in their company" ON "public"."company_settings" FOR UPDATE USING (("company_id" = "public"."get_current_user_company_id"())) WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can update employee_compliance_snapshots in their company" ON "public"."employee_compliance_snapshots" FOR UPDATE USING (("company_id" = "public"."get_current_user_company_id"())) WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can update employees in their company" ON "public"."employees" FOR UPDATE USING (("company_id" = "public"."get_current_user_company_id"())) WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can update import_sessions in their company" ON "public"."import_sessions" FOR UPDATE USING (("company_id" = "public"."get_current_user_company_id"())) WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can update notification_log in their company" ON "public"."notification_log" FOR UPDATE USING (("company_id" = "public"."get_current_user_company_id"())) WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can update own MFA backup codes" ON "public"."mfa_backup_codes" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own notification preferences" ON "public"."notification_preferences" FOR UPDATE USING (("user_id" = "public"."get_current_user_id"())) WITH CHECK (("user_id" = "public"."get_current_user_id"()));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("id" = "public"."get_current_user_id"())) WITH CHECK (("id" = "public"."get_current_user_id"()));



CREATE POLICY "Users can update trips in their company" ON "public"."trips" FOR UPDATE USING (("company_id" = "public"."get_current_user_company_id"())) WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can view active employees in their company" ON "public"."employees" FOR SELECT USING ((("company_id" = "public"."get_current_user_company_id"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "Users can view alerts in their company" ON "public"."alerts" FOR SELECT USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can view audit_log in their company" ON "public"."audit_log" FOR SELECT USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can view background_jobs in their company" ON "public"."background_jobs" FOR SELECT USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can view column_mappings in their company" ON "public"."column_mappings" FOR SELECT USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can view company_entitlements in their company" ON "public"."company_entitlements" FOR SELECT USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can view company_settings in their company" ON "public"."company_settings" FOR SELECT USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can view employee_compliance_snapshots in their company" ON "public"."employee_compliance_snapshots" FOR SELECT USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can view import_sessions in their company" ON "public"."import_sessions" FOR SELECT USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can view notification_log in their company" ON "public"."notification_log" FOR SELECT USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can view own MFA backup codes" ON "public"."mfa_backup_codes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own MFA backup sessions" ON "public"."mfa_backup_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own notification preferences" ON "public"."notification_preferences" FOR SELECT USING (("user_id" = "public"."get_current_user_id"()));



CREATE POLICY "Users can view profiles in their company" ON "public"."profiles" FOR SELECT USING ((("id" = "public"."get_current_user_id"()) OR ("company_id" = "public"."get_current_user_company_id"())));



CREATE POLICY "Users can view their own company" ON "public"."companies" FOR SELECT USING (("id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can view trips in their company" ON "public"."trips" FOR SELECT USING (("company_id" = "public"."get_current_user_company_id"()));



ALTER TABLE "public"."admin_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."background_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."column_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_entitlements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_compliance_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."import_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mfa_backup_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mfa_backup_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schengen_countries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schengen_countries_public_read" ON "public"."schengen_countries" FOR SELECT USING (true);



ALTER TABLE "public"."tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trips" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."waitlist" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."create_company_and_profile"("user_id" "uuid", "user_email" "text", "company_name" "text", "user_terms_accepted_at" timestamp with time zone, "user_auth_provider" "text", "user_first_name" "text", "user_last_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_company_and_profile"("user_id" "uuid", "user_email" "text", "company_name" "text", "user_terms_accepted_at" timestamp with time zone, "user_auth_provider" "text", "user_first_name" "text", "user_last_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_company_entitlements"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_company_entitlements"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_company_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_company_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_last_audit_hash"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_last_audit_hash"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_auth_user_if_needed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_auth_user_if_needed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_oauth_user_if_needed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_oauth_user_if_needed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."invalidate_compliance_snapshot"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."invalidate_compliance_snapshot"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_admin_audit_log_modifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_admin_audit_log_modifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_audit_log_modifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_audit_log_modifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unsubscribe_by_token"("token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unsubscribe_by_token"("token" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_column_mappings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_column_mappings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."admin_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."alerts" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."background_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."background_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."column_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."column_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_entitlements" TO "authenticated";
GRANT ALL ON TABLE "public"."company_entitlements" TO "service_role";



GRANT ALL ON TABLE "public"."company_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."company_notes" TO "service_role";



GRANT ALL ON TABLE "public"."company_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."company_settings" TO "service_role";



GRANT ALL ON TABLE "public"."employee_compliance_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_compliance_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."trips" TO "authenticated";
GRANT ALL ON TABLE "public"."trips" TO "service_role";



GRANT ALL ON TABLE "public"."employee_compliance_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_compliance_summary" TO "service_role";



GRANT ALL ON TABLE "public"."import_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."import_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."mfa_backup_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."mfa_backup_codes" TO "service_role";



GRANT ALL ON TABLE "public"."mfa_backup_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."mfa_backup_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."notification_log" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_log" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."schengen_countries" TO "authenticated";
GRANT ALL ON TABLE "public"."schengen_countries" TO "service_role";



GRANT ALL ON TABLE "public"."tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."tiers" TO "service_role";



GRANT ALL ON TABLE "public"."waitlist" TO "authenticated";
GRANT ALL ON TABLE "public"."waitlist" TO "service_role";
GRANT INSERT ON TABLE "public"."waitlist" TO "anon";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































drop extension if exists "pg_net";

drop policy "Allow anonymous waitlist insert with validation" on "public"."waitlist";

revoke delete on table "public"."admin_audit_log" from "anon";

revoke insert on table "public"."admin_audit_log" from "anon";

revoke references on table "public"."admin_audit_log" from "anon";

revoke select on table "public"."admin_audit_log" from "anon";

revoke trigger on table "public"."admin_audit_log" from "anon";

revoke truncate on table "public"."admin_audit_log" from "anon";

revoke update on table "public"."admin_audit_log" from "anon";

revoke delete on table "public"."alerts" from "anon";

revoke insert on table "public"."alerts" from "anon";

revoke references on table "public"."alerts" from "anon";

revoke select on table "public"."alerts" from "anon";

revoke trigger on table "public"."alerts" from "anon";

revoke truncate on table "public"."alerts" from "anon";

revoke update on table "public"."alerts" from "anon";

revoke delete on table "public"."audit_log" from "anon";

revoke insert on table "public"."audit_log" from "anon";

revoke references on table "public"."audit_log" from "anon";

revoke select on table "public"."audit_log" from "anon";

revoke trigger on table "public"."audit_log" from "anon";

revoke truncate on table "public"."audit_log" from "anon";

revoke update on table "public"."audit_log" from "anon";

revoke delete on table "public"."audit_log" from "authenticated";

revoke update on table "public"."audit_log" from "authenticated";

revoke delete on table "public"."background_jobs" from "anon";

revoke insert on table "public"."background_jobs" from "anon";

revoke references on table "public"."background_jobs" from "anon";

revoke select on table "public"."background_jobs" from "anon";

revoke trigger on table "public"."background_jobs" from "anon";

revoke truncate on table "public"."background_jobs" from "anon";

revoke update on table "public"."background_jobs" from "anon";

revoke delete on table "public"."column_mappings" from "anon";

revoke insert on table "public"."column_mappings" from "anon";

revoke references on table "public"."column_mappings" from "anon";

revoke select on table "public"."column_mappings" from "anon";

revoke trigger on table "public"."column_mappings" from "anon";

revoke truncate on table "public"."column_mappings" from "anon";

revoke update on table "public"."column_mappings" from "anon";

revoke delete on table "public"."companies" from "anon";

revoke insert on table "public"."companies" from "anon";

revoke references on table "public"."companies" from "anon";

revoke select on table "public"."companies" from "anon";

revoke trigger on table "public"."companies" from "anon";

revoke truncate on table "public"."companies" from "anon";

revoke update on table "public"."companies" from "anon";

revoke delete on table "public"."company_entitlements" from "anon";

revoke insert on table "public"."company_entitlements" from "anon";

revoke references on table "public"."company_entitlements" from "anon";

revoke select on table "public"."company_entitlements" from "anon";

revoke trigger on table "public"."company_entitlements" from "anon";

revoke truncate on table "public"."company_entitlements" from "anon";

revoke update on table "public"."company_entitlements" from "anon";

revoke delete on table "public"."company_notes" from "anon";

revoke insert on table "public"."company_notes" from "anon";

revoke references on table "public"."company_notes" from "anon";

revoke select on table "public"."company_notes" from "anon";

revoke trigger on table "public"."company_notes" from "anon";

revoke truncate on table "public"."company_notes" from "anon";

revoke update on table "public"."company_notes" from "anon";

revoke delete on table "public"."company_settings" from "anon";

revoke insert on table "public"."company_settings" from "anon";

revoke references on table "public"."company_settings" from "anon";

revoke select on table "public"."company_settings" from "anon";

revoke trigger on table "public"."company_settings" from "anon";

revoke truncate on table "public"."company_settings" from "anon";

revoke update on table "public"."company_settings" from "anon";

revoke delete on table "public"."employee_compliance_snapshots" from "anon";

revoke insert on table "public"."employee_compliance_snapshots" from "anon";

revoke references on table "public"."employee_compliance_snapshots" from "anon";

revoke select on table "public"."employee_compliance_snapshots" from "anon";

revoke trigger on table "public"."employee_compliance_snapshots" from "anon";

revoke truncate on table "public"."employee_compliance_snapshots" from "anon";

revoke update on table "public"."employee_compliance_snapshots" from "anon";

revoke delete on table "public"."employees" from "anon";

revoke insert on table "public"."employees" from "anon";

revoke references on table "public"."employees" from "anon";

revoke select on table "public"."employees" from "anon";

revoke trigger on table "public"."employees" from "anon";

revoke truncate on table "public"."employees" from "anon";

revoke update on table "public"."employees" from "anon";

revoke delete on table "public"."import_sessions" from "anon";

revoke insert on table "public"."import_sessions" from "anon";

revoke references on table "public"."import_sessions" from "anon";

revoke select on table "public"."import_sessions" from "anon";

revoke trigger on table "public"."import_sessions" from "anon";

revoke truncate on table "public"."import_sessions" from "anon";

revoke update on table "public"."import_sessions" from "anon";

revoke delete on table "public"."mfa_backup_codes" from "anon";

revoke insert on table "public"."mfa_backup_codes" from "anon";

revoke references on table "public"."mfa_backup_codes" from "anon";

revoke select on table "public"."mfa_backup_codes" from "anon";

revoke trigger on table "public"."mfa_backup_codes" from "anon";

revoke truncate on table "public"."mfa_backup_codes" from "anon";

revoke update on table "public"."mfa_backup_codes" from "anon";

revoke delete on table "public"."mfa_backup_sessions" from "anon";

revoke insert on table "public"."mfa_backup_sessions" from "anon";

revoke references on table "public"."mfa_backup_sessions" from "anon";

revoke select on table "public"."mfa_backup_sessions" from "anon";

revoke trigger on table "public"."mfa_backup_sessions" from "anon";

revoke truncate on table "public"."mfa_backup_sessions" from "anon";

revoke update on table "public"."mfa_backup_sessions" from "anon";

revoke delete on table "public"."notification_log" from "anon";

revoke insert on table "public"."notification_log" from "anon";

revoke references on table "public"."notification_log" from "anon";

revoke select on table "public"."notification_log" from "anon";

revoke trigger on table "public"."notification_log" from "anon";

revoke truncate on table "public"."notification_log" from "anon";

revoke update on table "public"."notification_log" from "anon";

revoke delete on table "public"."notification_preferences" from "anon";

revoke insert on table "public"."notification_preferences" from "anon";

revoke references on table "public"."notification_preferences" from "anon";

revoke select on table "public"."notification_preferences" from "anon";

revoke trigger on table "public"."notification_preferences" from "anon";

revoke truncate on table "public"."notification_preferences" from "anon";

revoke update on table "public"."notification_preferences" from "anon";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke select on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."schengen_countries" from "anon";

revoke insert on table "public"."schengen_countries" from "anon";

revoke references on table "public"."schengen_countries" from "anon";

revoke select on table "public"."schengen_countries" from "anon";

revoke trigger on table "public"."schengen_countries" from "anon";

revoke truncate on table "public"."schengen_countries" from "anon";

revoke update on table "public"."schengen_countries" from "anon";

revoke delete on table "public"."tiers" from "anon";

revoke insert on table "public"."tiers" from "anon";

revoke references on table "public"."tiers" from "anon";

revoke select on table "public"."tiers" from "anon";

revoke trigger on table "public"."tiers" from "anon";

revoke truncate on table "public"."tiers" from "anon";

revoke update on table "public"."tiers" from "anon";

revoke delete on table "public"."trips" from "anon";

revoke insert on table "public"."trips" from "anon";

revoke references on table "public"."trips" from "anon";

revoke select on table "public"."trips" from "anon";

revoke trigger on table "public"."trips" from "anon";

revoke truncate on table "public"."trips" from "anon";

revoke update on table "public"."trips" from "anon";

revoke delete on table "public"."waitlist" from "anon";

revoke references on table "public"."waitlist" from "anon";

revoke select on table "public"."waitlist" from "anon";

revoke trigger on table "public"."waitlist" from "anon";

revoke truncate on table "public"."waitlist" from "anon";

revoke update on table "public"."waitlist" from "anon";


create policy "Allow anonymous waitlist insert with validation"
on "public"."waitlist"
as permissive
for insert
to anon, authenticated
with check (
  ("email" IS NOT NULL)
  AND ("length"("email") >= 5)
  AND ("length"("email") <= 255)
  AND ("email" ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)
  AND (("source" IS NULL) OR ("source" = ANY (ARRAY['landing'::text, 'referral'::text, 'direct'::text, 'demo'::text])))
  AND (("company_name" IS NULL) OR ("length"("company_name") <= 200))
);


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_if_needed();

