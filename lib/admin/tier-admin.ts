import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  type TierFeatureFlagKey,
  TIER_FEATURE_FLAG_KEYS,
  TIER_UNLIMITED_CAP,
} from '@/lib/constants/admin-tiers'

export type { TierFeatureFlagKey } from '@/lib/constants/admin-tiers'
export { TIER_UNLIMITED_CAP, TIER_FEATURE_FLAG_KEYS }

export type TierRow = Database['public']['Tables']['tiers']['Row']

export interface TierFieldChange {
  field: string
  old_value: unknown
  new_value: unknown
}

const TIER_DIFF_KEYS = [
  'display_name',
  'description',
  'max_employees',
  'max_users',
  ...TIER_FEATURE_FLAG_KEYS,
  'stripe_price_id_monthly',
  'stripe_price_id_annual',
  'sort_order',
  'is_active',
] as const satisfies readonly (keyof TierRow)[]

function normalizeAuditValue(key: keyof TierRow, value: unknown): unknown {
  if (TIER_FEATURE_FLAG_KEYS.includes(key as TierFeatureFlagKey)) {
    return value === true
  }
  if (value === undefined) return null
  return value
}

export function diffTierRows(before: TierRow, after: TierRow): TierFieldChange[] {
  const changes: TierFieldChange[] = []
  for (const key of TIER_DIFF_KEYS) {
    const oldV = normalizeAuditValue(key, before[key])
    const newV = normalizeAuditValue(key, after[key])
    if (oldV !== newV) {
      changes.push({ field: key, old_value: oldV, new_value: newV })
    }
  }
  return changes
}

export function auditChangesForTierCreate(row: TierRow): TierFieldChange[] {
  const changes: TierFieldChange[] = [{ field: 'slug', old_value: null, new_value: row.slug }]
  for (const key of TIER_DIFF_KEYS) {
    changes.push({
      field: key,
      old_value: null,
      new_value: normalizeAuditValue(key, row[key]),
    })
  }
  return changes
}

export function auditChangesForTierDelete(row: TierRow): TierFieldChange[] {
  const changes: TierFieldChange[] = [{ field: 'slug', old_value: row.slug, new_value: null }]
  for (const key of TIER_DIFF_KEYS) {
    changes.push({
      field: key,
      old_value: normalizeAuditValue(key, row[key]),
      new_value: null,
    })
  }
  return changes
}

/**
 * Counts companies on a tier whose live usage exceeds proposed caps.
 * Skips each dimension when the proposed cap is {@link TIER_UNLIMITED_CAP}.
 */
export async function countCompaniesExceedingTierLimits(
  supabase: SupabaseClient,
  tierSlug: string,
  proposedMaxEmployees: number,
  proposedMaxUsers: number
): Promise<{ overEmployees: number; overUsers: number }> {
  const { data: entRows, error } = await supabase
    .from('company_entitlements')
    .select('company_id')
    .eq('tier_slug', tierSlug)

  if (error || !entRows?.length) {
    return { overEmployees: 0, overUsers: 0 }
  }

  const companyIds = [...new Set(entRows.map((r) => r.company_id).filter(Boolean))] as string[]

  const [empRes, profRes] = await Promise.all([
    supabase
      .from('employees')
      .select('company_id')
      .in('company_id', companyIds)
      .is('deleted_at', null),
    supabase.from('profiles').select('company_id').in('company_id', companyIds),
  ])

  const empCounts = new Map<string, number>()
  for (const row of empRes.data ?? []) {
    empCounts.set(row.company_id, (empCounts.get(row.company_id) ?? 0) + 1)
  }

  const userCounts = new Map<string, number>()
  for (const row of profRes.data ?? []) {
    if (!row.company_id) continue
    userCounts.set(row.company_id, (userCounts.get(row.company_id) ?? 0) + 1)
  }

  let overEmployees = 0
  let overUsers = 0
  for (const cid of companyIds) {
    const ec = empCounts.get(cid) ?? 0
    const uc = userCounts.get(cid) ?? 0
    if (proposedMaxEmployees < TIER_UNLIMITED_CAP && ec > proposedMaxEmployees) {
      overEmployees++
    }
    if (proposedMaxUsers < TIER_UNLIMITED_CAP && uc > proposedMaxUsers) {
      overUsers++
    }
  }

  return { overEmployees, overUsers }
}

export async function countCompaniesOnTier(
  supabase: SupabaseClient,
  tierSlug: string
): Promise<number> {
  const { count, error } = await supabase
    .from('company_entitlements')
    .select('*', { count: 'exact', head: true })
    .eq('tier_slug', tierSlug)

  if (error) {
    console.error('[countCompaniesOnTier]', error.message)
    return 0
  }
  return count ?? 0
}
