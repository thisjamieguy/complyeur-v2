-- Migration: Ensure auth users always have a profile + company
-- This trigger provisions a company/profile for both OAuth and email/password users
-- to prevent orphaned auth.users records.

CREATE OR REPLACE FUNCTION handle_auth_user_if_needed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Note: Creating triggers on auth.users requires supabase_auth_admin role.
DROP TRIGGER IF EXISTS on_auth_user_created_oauth ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_user_if_needed();
