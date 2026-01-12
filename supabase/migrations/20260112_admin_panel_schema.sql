-- ============================================================
-- Migration: 20260112_admin_panel_schema.sql
-- Purpose: Internal admin panel infrastructure for Phase 21
-- ============================================================

-- Add is_superadmin flag to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- Create index for superadmin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_superadmin ON profiles(is_superadmin) WHERE is_superadmin = true;

-- ============================================================
-- TABLE: tiers
-- Purpose: Global tier definitions (reference table)
-- ============================================================
CREATE TABLE IF NOT EXISTS tiers (
  slug TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  max_employees INTEGER NOT NULL DEFAULT 10,
  max_users INTEGER NOT NULL DEFAULT 2,
  can_export_csv BOOLEAN DEFAULT false,
  can_export_pdf BOOLEAN DEFAULT false,
  can_forecast BOOLEAN DEFAULT false,
  can_calendar BOOLEAN DEFAULT false,
  can_bulk_import BOOLEAN DEFAULT false,
  can_api_access BOOLEAN DEFAULT false,
  can_sso BOOLEAN DEFAULT false,
  can_audit_logs BOOLEAN DEFAULT false,
  stripe_price_id_monthly TEXT,
  stripe_price_id_annual TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default tier data
INSERT INTO tiers (slug, display_name, max_employees, max_users, can_export_csv, can_export_pdf, can_forecast, can_calendar, can_bulk_import, sort_order) VALUES
  ('free', 'Free', 10, 2, true, false, false, false, false, 0),
  ('starter', 'Starter', 50, 5, true, true, true, true, false, 1),
  ('professional', 'Professional', 200, 15, true, true, true, true, true, 2),
  ('enterprise', 'Enterprise', 999999, 999999, true, true, true, true, true, 3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- TABLE: company_entitlements
-- Purpose: Per-company entitlements with tier inheritance
-- ============================================================
CREATE TABLE IF NOT EXISTS company_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  tier_slug TEXT REFERENCES tiers(slug) DEFAULT 'free',

  -- Overridable limits (null = use tier default)
  max_employees INTEGER,
  max_users INTEGER,

  -- Overridable features (null = use tier default)
  can_export_csv BOOLEAN,
  can_export_pdf BOOLEAN,
  can_forecast BOOLEAN,
  can_calendar BOOLEAN,
  can_bulk_import BOOLEAN,
  can_api_access BOOLEAN,
  can_sso BOOLEAN,
  can_audit_logs BOOLEAN,

  -- Trial management
  is_trial BOOLEAN DEFAULT true,
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),

  -- Account status
  is_suspended BOOLEAN DEFAULT false,
  suspended_at TIMESTAMPTZ,
  suspended_reason TEXT,

  -- Manual override tracking
  manual_override BOOLEAN DEFAULT false,
  override_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entitlements_company ON company_entitlements(company_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_tier ON company_entitlements(tier_slug);
CREATE INDEX IF NOT EXISTS idx_entitlements_trial ON company_entitlements(trial_ends_at) WHERE is_trial = true;
CREATE INDEX IF NOT EXISTS idx_entitlements_suspended ON company_entitlements(is_suspended) WHERE is_suspended = true;

-- ============================================================
-- TABLE: company_notes
-- Purpose: Admin notes on customer accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS company_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES profiles(id),
  note_content TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN (
    'general', 'support', 'billing', 'custom_deal',
    'feature_request', 'bug_report', 'churn_risk',
    'onboarding', 'upsell_opportunity'
  )),
  is_pinned BOOLEAN DEFAULT false,
  follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_company ON company_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON company_notes(company_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_notes_follow_up ON company_notes(follow_up_date) WHERE follow_up_date IS NOT NULL;

-- ============================================================
-- TABLE: admin_audit_log
-- Purpose: Track all admin actions for accountability
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES profiles(id),
  target_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  details_before JSONB,
  details_after JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_company ON admin_audit_log(target_company_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at DESC);

-- ============================================================
-- RLS POLICIES: Admin tables use service role only
-- ============================================================
-- These tables are accessed via service role (bypassing RLS)
-- Regular users should NEVER access these tables

ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- No SELECT policies for regular users = complete isolation
-- Admin access happens via service role client

-- ============================================================
-- TRIGGERS: Auto-update updated_at columns
-- ============================================================
DROP TRIGGER IF EXISTS update_tiers_updated_at ON tiers;
CREATE TRIGGER update_tiers_updated_at
  BEFORE UPDATE ON tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_entitlements_updated_at ON company_entitlements;
CREATE TRIGGER update_company_entitlements_updated_at
  BEFORE UPDATE ON company_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_notes_updated_at ON company_notes;
CREATE TRIGGER update_company_notes_updated_at
  BEFORE UPDATE ON company_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNCTION: Create default entitlements for new companies
-- ============================================================
CREATE OR REPLACE FUNCTION create_default_company_entitlements()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO company_entitlements (company_id, tier_slug, is_trial, trial_ends_at)
  VALUES (NEW.id, 'free', true, NOW() + INTERVAL '14 days')
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create entitlements for new companies
DROP TRIGGER IF EXISTS create_company_entitlements_trigger ON companies;
CREATE TRIGGER create_company_entitlements_trigger
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION create_default_company_entitlements();

-- ============================================================
-- BACKFILL: Create entitlements for existing companies
-- ============================================================
INSERT INTO company_entitlements (company_id, tier_slug, is_trial, trial_ends_at)
SELECT id, 'free', false, NULL
FROM companies
WHERE id NOT IN (SELECT company_id FROM company_entitlements WHERE company_id IS NOT NULL)
ON CONFLICT (company_id) DO NOTHING;
