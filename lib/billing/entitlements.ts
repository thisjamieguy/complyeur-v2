import { createClient } from '@/lib/supabase/server'
import { requireCompanyAccess } from '@/lib/security/tenant-access'

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
 * Check if the current user's company has a specific entitlement.
 * Server-side only — uses Supabase server client with RLS.
 *
 * Returns true if the entitlement is granted, false otherwise.
 */
export async function checkEntitlement(flag: EntitlementFlag): Promise<boolean> {
  const supabase = await createClient()
  const { companyId } = await requireCompanyAccess(supabase)

  const { data: entitlements } = await supabase
    .from('company_entitlements')
    .select(flag)
    .eq('company_id', companyId)
    .single()

  if (!entitlements) return false
  return (entitlements as Record<string, boolean | null>)[flag] ?? false
}

/**
 * Get all entitlements for the current user's company.
 * Useful for rendering plan info or gating multiple features at once.
 */
export async function getCompanyEntitlements() {
  const supabase = await createClient()
  const { companyId } = await requireCompanyAccess(supabase)

  const { data, error } = await supabase
    .from('company_entitlements')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (error || !data) {
    return null
  }

  return data
}
