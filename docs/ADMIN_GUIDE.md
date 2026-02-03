# ComplyEUR Admin Panel Guide

> **Who is this for?** Super admins managing companies, subscriptions, and users.
> **Access URL:** `https://complyeur.com/admin`

---

## Table of Contents

1. [Getting Admin Access](#getting-admin-access)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Companies](#managing-companies)
4. [Subscription Tiers](#subscription-tiers)
5. [Common Tasks](#common-tasks)
6. [Activity & Audit Log](#activity--audit-log)
7. [Database Reference](#database-reference)
8. [Troubleshooting](#troubleshooting)

---

## Getting Admin Access

### Requirements
- Your profile must have `is_superadmin = true`
- MFA must be enabled and verified

### How to Grant Admin Access

**Option 1: Supabase Dashboard**
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Table Editor** → **profiles**
4. Find the user by email
5. Set `is_superadmin` to `true`

**Option 2: SQL Editor**
```sql
UPDATE profiles
SET is_superadmin = true
WHERE email = 'user@example.com';
```

### Security Notes
- All admin actions are logged to `admin_audit_log`
- Admin uses service role (bypasses RLS)
- Never share service role key

---

## Dashboard Overview

**URL:** `/admin`

The dashboard shows at-a-glance business metrics:

| Metric | Description |
|--------|-------------|
| Total Companies | All registered companies |
| Total Users | All user accounts |
| Total Employees | Employees being tracked |
| Active Trials | Companies on trial period |

### Alerts
- **Trials expiring within 7 days** - Red alert banner
- **Recent signups** - Last 5 new companies
- **Recent admin activity** - Last 10 admin actions

---

## Managing Companies

### Company List

**URL:** `/admin/companies`

**Search & Filters:**
- Search by company name or slug
- Filter by tier: Free, Starter, Professional, Enterprise
- Filter by status: All, Active, Trial, Suspended

**Status Badges:**

| Badge | Meaning |
|-------|---------|
| 🟢 Active | Paid customer |
| 🔵 Trial | On trial period (shows expiry) |
| 🔴 Suspended | Account suspended |
| 🔴 Trial Expired | Trial ended, no conversion |

### Company Detail Page

**URL:** `/admin/companies/[id]`

#### Tabs:

| Tab | What It Shows |
|-----|---------------|
| **Overview** | Subscription, usage, features, team members |
| **Entitlements** | Tier management, trial controls, suspend/restore |
| **Users** | All team members (read-only) |
| **Notes** | Admin notes with categories |
| **Activity** | Audit log for this company |

---

## Subscription Tiers

**URL:** `/admin/tiers`

### Tier Comparison

| Feature | Free | Starter | Professional | Enterprise |
|---------|------|---------|--------------|------------|
| Max Employees | 10 | 50 | 200 | Unlimited |
| Max Users | 2 | 5 | 15 | Unlimited |
| CSV Export | ✅ | ✅ | ✅ | ✅ |
| PDF Export | ❌ | ✅ | ✅ | ✅ |
| Trip Forecast | ❌ | ✅ | ✅ | ✅ |
| Calendar View | ❌ | ✅ | ✅ | ✅ |
| **Bulk Import** | ❌ | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ❌ | ✅ |
| SSO | ❌ | ❌ | ❌ | ✅ |
| Audit Logs | ❌ | ❌ | ❌ | ✅ |

### How Entitlements Work

1. Company is assigned a **tier** (free, starter, professional, enterprise)
2. Tier defines default features and limits
3. **Manual overrides** can enable specific features regardless of tier
4. Overrides are tracked with `manual_override = true` and `override_notes`

---

## Common Tasks

### Change a Company's Tier

1. Go to `/admin/companies/[id]`
2. Click **Entitlements** tab
3. Select new tier from dropdown
4. Change applies immediately
5. Action is logged

### Extend a Trial

1. Go to `/admin/companies/[id]`
2. Click **Entitlements** tab
3. Click **Extend Trial** button
4. Enter days to extend (1-365)
5. Optionally add a reason
6. Click **Extend**

### Convert Trial to Paid

1. Go to `/admin/companies/[id]`
2. Click **Entitlements** tab
3. Click **Convert to Paid**
4. Trial flags are removed
5. Customer retains current tier

### Suspend an Account

1. Go to `/admin/companies/[id]`
2. Click **Entitlements** tab
3. Click **Suspend Account**
4. Enter reason (required)
5. Confirm suspension

**What happens:**
- Company loses all access
- Users see "account suspended" message
- Can be restored anytime

### Restore a Suspended Account

1. Go to `/admin/companies/[id]`
2. Click **Entitlements** tab
3. Click **Restore Account**
4. Access is immediately restored

### Add an Admin Note

1. Go to `/admin/companies/[id]`
2. Click **Notes** tab
3. Click **Add Note**
4. Fill in:
   - Note content
   - Category (see below)
   - Pin status (optional)
   - Follow-up date (optional)
5. Click **Create**

**Note Categories:**

| Category | Use For |
|----------|---------|
| General | Default, miscellaneous |
| Support | Support ticket references |
| Billing | Payment issues |
| Custom Deal | Special pricing/terms |
| Feature Request | Customer feature requests |
| Bug Report | Reported bugs |
| Churn Risk | At-risk customers |
| Onboarding | Onboarding progress |
| Upsell Opportunity | Sales opportunities |

### Manually Enable a Feature

Use the Supabase SQL Editor:

```sql
-- Enable bulk import for a specific company
UPDATE company_entitlements
SET can_bulk_import = true,
    manual_override = true,
    override_notes = 'Enabled for demo purposes'
WHERE company_id = 'COMPANY_UUID';
```

Or use the REST API:
```bash
curl -X PATCH 'https://PROJECT.supabase.co/rest/v1/company_entitlements?company_id=eq.COMPANY_UUID' \
  -H 'apikey: SERVICE_ROLE_KEY' \
  -H 'Authorization: Bearer SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"can_bulk_import": true, "manual_override": true}'
```

---

## Activity & Audit Log

**URL:** `/admin/activity`

### What Gets Logged

Every admin action is recorded with:

| Field | Description |
|-------|-------------|
| Admin | Who performed the action |
| Action | What was done |
| Company | Which company was affected |
| Details | JSON payload with specifics |
| Before/After | State snapshots for changes |
| IP Address | Admin's IP |
| Timestamp | When it happened (UTC) |

### Action Types

| Action | Description |
|--------|-------------|
| `company.viewed` | Admin viewed company detail |
| `company.suspended` | Account suspended |
| `company.restored` | Account restored |
| `tier.changed` | Subscription tier changed |
| `trial.extended` | Trial period extended |
| `trial.converted` | Trial converted to paid |
| `entitlement.updated` | Features/limits modified |
| `note.created` | Note added |
| `note.updated` | Note edited |
| `note.deleted` | Note deleted |
| `note.pinned` | Note pinned |
| `note.unpinned` | Note unpinned |

### Audit Log Retention
- Logs are **permanent** and **immutable**
- Cannot be deleted or modified
- Required for SOC 2 compliance

---

## Database Reference

### Key Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts, `is_superadmin` flag |
| `companies` | Company records |
| `company_entitlements` | Tier, features, trial status |
| `company_notes` | Admin notes on companies |
| `admin_audit_log` | All admin actions |
| `tiers` | Tier definitions (reference) |

### Key IDs to Know

Find these in the Supabase dashboard or via SQL:

```sql
-- Find a user's IDs by email
SELECT p.id as user_id, p.company_id, p.email, c.name as company_name
FROM profiles p
LEFT JOIN companies c ON p.company_id = c.id
WHERE p.email = 'user@example.com';
```

### Useful Queries

**List all trials expiring soon:**
```sql
SELECT c.name, ce.trial_ends_at, ce.tier_slug
FROM company_entitlements ce
JOIN companies c ON c.id = ce.company_id
WHERE ce.is_trial = true
  AND ce.trial_ends_at < NOW() + INTERVAL '7 days'
ORDER BY ce.trial_ends_at;
```

**List all suspended accounts:**
```sql
SELECT c.name, ce.suspended_at, ce.suspended_reason
FROM company_entitlements ce
JOIN companies c ON c.id = ce.company_id
WHERE ce.is_suspended = true
ORDER BY ce.suspended_at DESC;
```

**Count users per tier:**
```sql
SELECT ce.tier_slug, COUNT(*) as companies
FROM company_entitlements ce
GROUP BY ce.tier_slug
ORDER BY companies DESC;
```

**Recent admin actions:**
```sql
SELECT
  p.email as admin_email,
  aal.action,
  c.name as company_name,
  aal.created_at
FROM admin_audit_log aal
LEFT JOIN profiles p ON p.id = aal.admin_user_id
LEFT JOIN companies c ON c.id = aal.target_company_id
ORDER BY aal.created_at DESC
LIMIT 20;
```

---

## Troubleshooting

### "Not authorized" when accessing /admin

**Cause:** `is_superadmin` is not true for your profile.

**Fix:**
```sql
UPDATE profiles
SET is_superadmin = true
WHERE email = 'your@email.com';
```

### "MFA required" error

**Cause:** Super admins must have MFA enabled.

**Fix:**
1. Log out
2. Go to `/mfa`
3. Complete MFA setup
4. Try admin again

### Company entitlements not showing

**Cause:** Entitlement row missing for company.

**Fix:**
```sql
-- Create default entitlements for a company
INSERT INTO company_entitlements (company_id, tier_slug, is_trial)
VALUES ('COMPANY_UUID', 'free', true)
ON CONFLICT (company_id) DO NOTHING;
```

### Feature enabled but still blocked

**Cause:** Feature check uses tier defaults when override is null.

**Fix:** Explicitly set the feature flag:
```sql
UPDATE company_entitlements
SET can_bulk_import = true  -- Must be true, not null
WHERE company_id = 'COMPANY_UUID';
```

### Audit log not showing actions

**Cause:** Action may not have been logged (rare).

**Check:** Query the log directly:
```sql
SELECT * FROM admin_audit_log
WHERE target_company_id = 'COMPANY_UUID'
ORDER BY created_at DESC;
```

---

## Quick Reference

### Your Key IDs

| What | Value |
|------|-------|
| Your User ID | `776ffe7d-fdc4-4d42-925d-5d9b514a10d3` |
| Your Company ID | `7a3ba341-207e-494d-80cd-f15e6f3e7a5e` |
| Supabase Project | `ympwgavzlvyklkucskcj` |

### URLs

| Page | URL |
|------|-----|
| Admin Dashboard | `/admin` |
| Companies List | `/admin/companies` |
| Company Detail | `/admin/companies/[id]` |
| Tiers | `/admin/tiers` |
| Activity Log | `/admin/activity` |
| Settings | `/admin/settings` |

### Supabase Dashboard

- **URL:** https://supabase.com/dashboard/project/ympwgavzlvyklkucskcj
- **Table Editor:** For direct data edits
- **SQL Editor:** For complex queries
- **Auth:** For user management

---

*Last updated: January 2026*
