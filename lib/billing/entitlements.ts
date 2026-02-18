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
 * Cached bulk fetch of all entitlements for the current user's company.
 * Deduplicated within a single request via React.cache().
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
