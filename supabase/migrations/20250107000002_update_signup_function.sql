-- ============================================================================
-- Update signup function to also create company_settings
-- ============================================================================
-- This migration updates the create_company_and_profile function to also
-- create a company_settings record with default values during signup.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_company_and_profile(
  user_id UUID,
  user_email TEXT,
  company_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_company_id UUID;
  company_slug TEXT;
BEGIN
  -- Generate a slug from the company name
  -- Convert to lowercase, replace spaces and special chars with hyphens
  company_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9\s]', '', 'g'));
  company_slug := regexp_replace(company_slug, '\s+', '-', 'g');

  -- Insert company record with generated slug
  INSERT INTO companies (name, slug)
  VALUES (company_name, company_slug)
  RETURNING id INTO new_company_id;

  -- Insert profile record linking user to company
  INSERT INTO profiles (id, company_id, email)
  VALUES (user_id, new_company_id, user_email);

  -- Insert company_settings with defaults
  INSERT INTO company_settings (company_id)
  VALUES (new_company_id);

  -- Return the company ID for use in the application
  RETURN new_company_id;
END;
$$;

-- Grant execute permission to authenticated users (re-grant after replace)
GRANT EXECUTE ON FUNCTION create_company_and_profile(UUID, TEXT, TEXT) TO authenticated;
