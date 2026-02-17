-- Add Stripe billing columns for webhook integration
-- This migration adds fields needed to link companies to their Stripe subscriptions

-- Add stripe_customer_id to companies table
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;

-- Add subscription tracking to company_entitlements
ALTER TABLE public.company_entitlements
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none'
    CHECK (subscription_status IN ('none', 'active', 'past_due', 'canceled', 'incomplete', 'trialing', 'unpaid'));

-- Index for fast lookup by stripe_customer_id (used in webhook handler)
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer_id
  ON public.companies (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Index for fast lookup by stripe_subscription_id (used in webhook handler)
CREATE INDEX IF NOT EXISTS idx_entitlements_stripe_subscription_id
  ON public.company_entitlements (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Add RLS policy for the new columns (existing policies already cover SELECT/UPDATE on company_entitlements)
-- No new policies needed — existing company-scoped policies apply to all columns

COMMENT ON COLUMN public.companies.stripe_customer_id IS 'Stripe Customer ID (cus_...) — set during first checkout';
COMMENT ON COLUMN public.company_entitlements.stripe_subscription_id IS 'Stripe Subscription ID (sub_...) — set by webhook on checkout.session.completed';
COMMENT ON COLUMN public.company_entitlements.subscription_status IS 'Mirrors Stripe subscription status — updated by webhook events';
