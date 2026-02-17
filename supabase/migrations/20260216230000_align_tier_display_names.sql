-- Align tier display names with landing page naming convention
-- free -> Basic
-- starter -> Pro
-- professional -> Pro+
-- enterprise -> Enterprise

BEGIN;

UPDATE public.tiers
SET
  display_name = CASE slug
    WHEN 'free' THEN 'Basic'
    WHEN 'starter' THEN 'Pro'
    WHEN 'professional' THEN 'Pro+'
    WHEN 'enterprise' THEN 'Enterprise'
    ELSE display_name
  END,
  updated_at = now()
WHERE slug IN ('free', 'starter', 'professional', 'enterprise');

COMMIT;
