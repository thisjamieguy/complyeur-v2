import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { requireCompanyAccessCached } from '@/lib/security/tenant-access'

/**
 * Entitlement flag names — must match column names in company_entitlements table
 */
export type EntitlementFlag =
  | 'can_export_csv'
  | 'can_export_pdf'
  | 'can_forecast'
  | 'can_calendar'
  | 'can_bulk_import'
  | 'can_api_access'
  | 'can_sso'
  | 'can_audit_logs'

/**
 * Feature flags that may be NULL on a freshly-created company and need to fall
 * back to the tier's defaults.
 */
const ENTITLEMENT_FLAGS: EntitlementFlag[] = [
  'can_export_csv',
  'can_export_pdf',
  'can_forecast',
  'can_calendar',
  'can_bulk_import',
  'can_api_access',
  'can_sso',
  'can_audit_logs',
]

/**
 * Cached bulk fetch of all entitlements for the current user's company.
 * Deduplicated within a single request via React.cache().
 *
 * New/trial companies are created with only `tier_slug` set — the boolean
 * feature columns are NULL until a billing event populates them. To avoid
 * silently disabling features the plan actually includes, any NULL flag is
 * backfilled here from the tier's default. Explicit `false` (e.g. a manual
 * override or a paid downgrade) is preserved.
 */
const getCompanyEntitlementsCached = cache(async () => {
  const { companyId } = await requireCompanyAccessCached()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('company_entitlements')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (error || !data) return null

  const row = data as unknown as Record<string, boolean | null | string>
  const needsBackfill = ENTITLEMENT_FLAGS.some((f) => row[f] === null || row[f] === undefined)
  if (!needsBackfill) return data

  const tierSlug = (row.tier_slug as string | null) ?? 'free'
  const { data: tier } = await supabase
    .from('tiers')
    .select('*')
    .eq('slug', tierSlug)
    .single()

  if (!tier) return data

  const tierRow = tier as unknown as Record<string, boolean | null>
  for (const flag of ENTITLEMENT_FLAGS) {
    if (row[flag] === null || row[flag] === undefined) {
      row[flag] = tierRow[flag] ?? false
    }
  }

  return data
})

/**
 * Check if the current user's company has a specific entitlement.
 * Server-side only — uses Supabase server client with RLS.
 *
 * Uses cached bulk fetch — multiple calls within one request produce only 1 DB query.
 */
export async function checkEntitlement(flag: EntitlementFlag): Promise<boolean> {
  const entitlements = await getCompanyEntitlementsCached()
  if (!entitlements) return false
  return (entitlements as unknown as Record<string, boolean | null>)[flag] ?? false
}

/**
 * Get all entitlements for the current user's company.
 * Useful for rendering plan info or gating multiple features at once.
 * Uses the same cached query as checkEntitlement.
 */
export async function getCompanyEntitlements() {
  return getCompanyEntitlementsCached()
}
