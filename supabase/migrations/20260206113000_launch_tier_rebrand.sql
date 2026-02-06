-- Launch pricing model update (phase 1: keep existing slugs, update public-facing tier metadata)
-- Mapping:
-- free -> Basic
-- starter -> Pro
-- professional -> Pro+
-- enterprise -> Enterprise (Legacy), inactive for new sales surfaces

BEGIN;

INSERT INTO public.tiers (
  slug,
  display_name,
  description,
  max_employees,
  max_users,
  can_export_csv,
  can_export_pdf,
  can_forecast,
  can_calendar,
  can_bulk_import,
  can_api_access,
  can_sso,
  can_audit_logs,
  stripe_price_id_monthly,
  stripe_price_id_annual,
  sort_order,
  is_active
)
VALUES
  (
    'free',
    'Basic',
    'Entry tier for smaller teams with occasional Schengen travel.',
    10,
    2,
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    'price_basic_monthly_gbp',
    'price_basic_annual_gbp',
    1,
    true
  ),
  (
    'starter',
    'Pro',
    'Core plan for teams that need regular compliance monitoring.',
    50,
    5,
    true,
    true,
    true,
    true,
    false,
    false,
    false,
    false,
    'price_pro_monthly_gbp',
    'price_pro_annual_gbp',
    2,
    true
  ),
  (
    'professional',
    'Pro+',
    'Highest self-serve tier for larger teams and broader oversight.',
    200,
    15,
    true,
    true,
    true,
    true,
    true,
    false,
    false,
    false,
    'price_pro_plus_monthly_gbp',
    'price_pro_plus_annual_gbp',
    3,
    true
  ),
  (
    'enterprise',
    'Enterprise (Legacy)',
    'Legacy plan retained for existing customers only.',
    999999,
    999999,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    NULL,
    NULL,
    99,
    false
  )
ON CONFLICT (slug)
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  max_employees = EXCLUDED.max_employees,
  max_users = EXCLUDED.max_users,
  can_export_csv = EXCLUDED.can_export_csv,
  can_export_pdf = EXCLUDED.can_export_pdf,
  can_forecast = EXCLUDED.can_forecast,
  can_calendar = EXCLUDED.can_calendar,
  can_bulk_import = EXCLUDED.can_bulk_import,
  can_api_access = EXCLUDED.can_api_access,
  can_sso = EXCLUDED.can_sso,
  can_audit_logs = EXCLUDED.can_audit_logs,
  stripe_price_id_monthly = COALESCE(NULLIF(public.tiers.stripe_price_id_monthly, ''), EXCLUDED.stripe_price_id_monthly),
  stripe_price_id_annual = COALESCE(NULLIF(public.tiers.stripe_price_id_annual, ''), EXCLUDED.stripe_price_id_annual),
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

COMMIT;
