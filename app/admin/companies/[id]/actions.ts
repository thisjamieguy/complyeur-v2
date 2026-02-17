'use server'

import { requireSuperAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { logAdminAction, ADMIN_ACTIONS } from '@/lib/admin/audit'
import { revalidatePath } from 'next/cache'
import { requireCompanyAccess } from '@/lib/security/tenant-access'
import {
  companyIdSchema,
  updateEntitlementsSchema,
  extendTrialSchema,
  suspendCompanySchema,
  type UpdateEntitlementsData,
} from '@/lib/validations/admin'

async function requireAdminCompanyAccess(companyId: string): Promise<void> {
  const supabase = await createClient()
  await requireCompanyAccess(supabase, companyId, { allowSuperadmin: true })
}

export async function updateEntitlements(
  companyId: string,
  data: UpdateEntitlementsData
) {
  // Validate company ID
  const companyIdResult = companyIdSchema.safeParse(companyId)
  if (!companyIdResult.success) {
    return { success: false, error: 'Invalid company ID format' }
  }

  // Validate entitlements data
  const dataResult = updateEntitlementsSchema.safeParse(data)
  if (!dataResult.success) {
    const errors = dataResult.error.issues.map((e) => e.message).join(', ')
    return { success: false, error: errors }
  }

  const { user } = await requireSuperAdmin()
  await requireAdminCompanyAccess(companyIdResult.data)
  const supabase = createAdminClient()

  // Get current state for audit log
  const { data: before } = await supabase
    .from('company_entitlements')
    .select('*')
    .eq('company_id', companyId)
    .single()

  // Update entitlements with validated data
  const { data: after, error } = await supabase
    .from('company_entitlements')
    .update({
      ...dataResult.data,
      manual_override: true,
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', companyIdResult.data)
    .select()
    .single()

  if (error) {
    console.error('Failed to update entitlements:', error)
    return { success: false, error: error.message }
  }

  // Log the action
  await logAdminAction({
    adminUserId: user.id,
    targetCompanyId: companyId,
    action: ADMIN_ACTIONS.ENTITLEMENT_UPDATED,
    detailsBefore: before as Record<string, unknown>,
    detailsAfter: after as Record<string, unknown>,
  })

  revalidatePath(`/admin/companies/${companyId}`)
  return { success: true }
}

export async function changeTier(companyId: string, tierSlug: string) {
  // Validate company ID
  const companyIdResult = companyIdSchema.safeParse(companyId)
  if (!companyIdResult.success) {
    return { success: false, error: 'Invalid company ID format' }
  }

  const { user } = await requireSuperAdmin()
  await requireAdminCompanyAccess(companyIdResult.data)
  const supabase = createAdminClient()

  // Fetch the tier defaults so we can sync all entitlements
  const { data: tierDefaults, error: tierError } = await supabase
    .from('tiers')
    .select(
      'slug, max_employees, max_users, can_export_csv, can_export_pdf, can_forecast, can_calendar, can_bulk_import, can_api_access, can_sso, can_audit_logs'
    )
    .eq('slug', tierSlug)
    .single()

  if (tierError || !tierDefaults) {
    console.error('Failed to fetch tier defaults:', tierError)
    return { success: false, error: 'Invalid tier selected' }
  }

  // Get current state for audit log
  const { data: before } = await supabase
    .from('company_entitlements')
    .select('*')
    .eq('company_id', companyIdResult.data)
    .single()

  // Update tier AND sync all entitlements from tier defaults
  const { data: after, error } = await supabase
    .from('company_entitlements')
    .update({
      tier_slug: tierSlug,
      max_employees: tierDefaults.max_employees,
      max_users: tierDefaults.max_users,
      can_export_csv: tierDefaults.can_export_csv,
      can_export_pdf: tierDefaults.can_export_pdf,
      can_forecast: tierDefaults.can_forecast,
      can_calendar: tierDefaults.can_calendar,
      can_bulk_import: tierDefaults.can_bulk_import,
      can_api_access: tierDefaults.can_api_access,
      can_sso: tierDefaults.can_sso,
      can_audit_logs: tierDefaults.can_audit_logs,
      manual_override: false,
      override_notes: null,
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', companyIdResult.data)
    .select()
    .single()

  if (error) {
    console.error('Failed to change tier:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    adminUserId: user.id,
    targetCompanyId: companyIdResult.data,
    action: ADMIN_ACTIONS.TIER_CHANGED,
    detailsBefore: before as Record<string, unknown>,
    detailsAfter: after as Record<string, unknown>,
  })

  revalidatePath(`/admin/companies/${companyId}`)
  return { success: true }
}

export async function extendTrial(
  companyId: string,
  days: number,
  reason?: string
) {
  // Validate company ID
  const companyIdResult = companyIdSchema.safeParse(companyId)
  if (!companyIdResult.success) {
    return { success: false, error: 'Invalid company ID format' }
  }

  // Validate trial extension data
  const dataResult = extendTrialSchema.safeParse({ days, reason })
  if (!dataResult.success) {
    const errors = dataResult.error.issues.map((e) => e.message).join(', ')
    return { success: false, error: errors }
  }

  const { user } = await requireSuperAdmin()
  await requireAdminCompanyAccess(companyIdResult.data)
  const supabase = createAdminClient()

  // Get current trial end date
  const { data: current } = await supabase
    .from('company_entitlements')
    .select('trial_ends_at, is_trial')
    .eq('company_id', companyId)
    .single()

  if (!current) {
    return { success: false, error: 'Company not found' }
  }

  // Calculate new end date using validated days
  const currentEnd = current.trial_ends_at
    ? new Date(current.trial_ends_at)
    : new Date()
  const newEnd = new Date(currentEnd)
  newEnd.setDate(newEnd.getDate() + dataResult.data.days)

  // Update trial
  const { error } = await supabase
    .from('company_entitlements')
    .update({
      is_trial: true,
      trial_ends_at: newEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', companyId)

  if (error) {
    console.error('Failed to extend trial:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    adminUserId: user.id,
    targetCompanyId: companyIdResult.data,
    action: ADMIN_ACTIONS.TRIAL_EXTENDED,
    details: {
      days_added: dataResult.data.days,
      old_end: current.trial_ends_at,
      new_end: newEnd.toISOString(),
      reason: dataResult.data.reason,
    },
  })

  revalidatePath(`/admin/companies/${companyId}`)
  return { success: true, newEndDate: newEnd }
}

export async function convertTrial(companyId: string) {
  const { user } = await requireSuperAdmin()
  await requireAdminCompanyAccess(companyId)
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('company_entitlements')
    .update({
      is_trial: false,
      trial_ends_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', companyId)

  if (error) {
    console.error('Failed to convert trial:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    adminUserId: user.id,
    targetCompanyId: companyId,
    action: ADMIN_ACTIONS.TRIAL_CONVERTED,
  })

  revalidatePath(`/admin/companies/${companyId}`)
  return { success: true }
}

export async function suspendCompany(companyId: string, reason: string) {
  // Validate company ID
  const companyIdResult = companyIdSchema.safeParse(companyId)
  if (!companyIdResult.success) {
    return { success: false, error: 'Invalid company ID format' }
  }

  // Validate suspension data
  const dataResult = suspendCompanySchema.safeParse({ reason })
  if (!dataResult.success) {
    const errors = dataResult.error.issues.map((e) => e.message).join(', ')
    return { success: false, error: errors }
  }

  const { user } = await requireSuperAdmin()
  await requireAdminCompanyAccess(companyIdResult.data)
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('company_entitlements')
    .update({
      is_suspended: true,
      suspended_at: new Date().toISOString(),
      suspended_reason: dataResult.data.reason,
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', companyIdResult.data)

  if (error) {
    console.error('Failed to suspend company:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    adminUserId: user.id,
    targetCompanyId: companyIdResult.data,
    action: ADMIN_ACTIONS.COMPANY_SUSPENDED,
    details: { reason: dataResult.data.reason },
  })

  revalidatePath(`/admin/companies/${companyId}`)
  return { success: true }
}

export async function restoreCompany(companyId: string) {
  const { user } = await requireSuperAdmin()
  await requireAdminCompanyAccess(companyId)
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('company_entitlements')
    .update({
      is_suspended: false,
      suspended_at: null,
      suspended_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', companyId)

  if (error) {
    console.error('Failed to restore company:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    adminUserId: user.id,
    targetCompanyId: companyId,
    action: ADMIN_ACTIONS.COMPANY_RESTORED,
  })

  revalidatePath(`/admin/companies/${companyId}`)
  return { success: true }
}
