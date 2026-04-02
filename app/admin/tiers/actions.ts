'use server'

import { verifySuperAdminSession } from '@/lib/admin/auth'
import { logAdminAction, ADMIN_ACTIONS } from '@/lib/admin/audit'
import {
  auditChangesForTierCreate,
  auditChangesForTierDelete,
  countCompaniesExceedingTierLimits,
  countCompaniesOnTier,
  diffTierRows,
  type TierRow,
} from '@/lib/admin/tier-admin'
import { checkServerActionRateLimit } from '@/lib/rate-limit'
import {
  adminTierSlugParamSchema,
  createTierFormSchema,
  updateTierFormSchema,
  type CreateTierFormData,
  type UpdateTierFormData,
} from '@/lib/validations/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

function revalidateTierSurfaces() {
  revalidatePath('/admin/tiers')
  revalidatePath('/admin/companies')
  revalidatePath('/admin/activity')
}

export async function createTier(data: CreateTierFormData) {
  const session = await verifySuperAdminSession()
  if (!session.ok) {
    return { success: false as const, status: session.status, error: session.error }
  }

  const rateLimit = await checkServerActionRateLimit(session.user.id, 'createTier')
  if (!rateLimit.allowed) {
    return { success: false as const, error: rateLimit.error ?? 'Rate limit exceeded' }
  }

  const parsed = createTierFormSchema.safeParse(data)
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(', ')
    return { success: false as const, error: msg }
  }

  const supabase = createAdminClient()
  const payload = parsed.data

  const insertRow = {
    slug: payload.slug,
    display_name: payload.display_name,
    description: payload.description ?? null,
    max_employees: payload.max_employees,
    max_users: payload.max_users,
    can_export_csv: payload.can_export_csv,
    can_export_pdf: payload.can_export_pdf,
    can_forecast: payload.can_forecast,
    can_calendar: payload.can_calendar,
    can_bulk_import: payload.can_bulk_import,
    can_api_access: payload.can_api_access,
    can_sso: payload.can_sso,
    can_audit_logs: payload.can_audit_logs,
    stripe_price_id_monthly: payload.stripe_price_id_monthly,
    stripe_price_id_annual: payload.stripe_price_id_annual,
    sort_order: payload.sort_order,
    is_active: payload.is_active,
  }

  const { data: created, error } = await supabase.from('tiers').insert(insertRow).select().single()

  if (error) {
    if (error.code === '23505') {
      return { success: false as const, error: 'This slug is already in use. Choose a different slug.' }
    }
    console.error('[createTier]', error)
    return { success: false as const, error: error.message }
  }

  await logAdminAction({
    adminUserId: session.user.id,
    action: ADMIN_ACTIONS.TIER_CREATED,
    details: {
      tier_slug: created.slug,
      changes: auditChangesForTierCreate(created as TierRow),
    },
  })

  revalidateTierSurfaces()
  return { success: true as const, tier: created }
}

export async function updateTier(slug: string, data: UpdateTierFormData) {
  const session = await verifySuperAdminSession()
  if (!session.ok) {
    return { success: false as const, status: session.status, error: session.error }
  }

  const rateLimit = await checkServerActionRateLimit(session.user.id, 'updateTier')
  if (!rateLimit.allowed) {
    return { success: false as const, error: rateLimit.error ?? 'Rate limit exceeded' }
  }

  const slugResult = adminTierSlugParamSchema.safeParse(slug)
  if (!slugResult.success) {
    return { success: false as const, error: 'Invalid tier slug' }
  }

  const parsed = updateTierFormSchema.safeParse(data)
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(', ')
    return { success: false as const, error: msg }
  }

  const supabase = createAdminClient()
  const tierSlug = slugResult.data
  const payload = parsed.data

  const { data: before, error: fetchError } = await supabase
    .from('tiers')
    .select('*')
    .eq('slug', tierSlug)
    .single()

  if (fetchError || !before) {
    return { success: false as const, error: 'Tier not found' }
  }

  const { overEmployees, overUsers } = await countCompaniesExceedingTierLimits(
    supabase,
    tierSlug,
    payload.max_employees,
    payload.max_users
  )

  if (overEmployees > 0) {
    return {
      success: false as const,
      error: `Max employees is too low: ${overEmployees} compan${overEmployees === 1 ? 'y' : 'ies'} on this tier have more employees than the new limit. Raise the limit or reduce usage before saving.`,
    }
  }
  if (overUsers > 0) {
    return {
      success: false as const,
      error: `Max users is too low: ${overUsers} compan${overUsers === 1 ? 'y' : 'ies'} on this tier have more users than the new limit. Raise the limit or remove users before saving.`,
    }
  }

  const updatePayload = {
    display_name: payload.display_name,
    description: payload.description ?? null,
    max_employees: payload.max_employees,
    max_users: payload.max_users,
    can_export_csv: payload.can_export_csv,
    can_export_pdf: payload.can_export_pdf,
    can_forecast: payload.can_forecast,
    can_calendar: payload.can_calendar,
    can_bulk_import: payload.can_bulk_import,
    can_api_access: payload.can_api_access,
    can_sso: payload.can_sso,
    can_audit_logs: payload.can_audit_logs,
    stripe_price_id_monthly: payload.stripe_price_id_monthly,
    stripe_price_id_annual: payload.stripe_price_id_annual,
    sort_order: payload.sort_order,
    is_active: payload.is_active,
    updated_at: new Date().toISOString(),
  }

  const { data: after, error } = await supabase
    .from('tiers')
    .update(updatePayload)
    .eq('slug', tierSlug)
    .select()
    .single()

  if (error || !after) {
    console.error('[updateTier]', error)
    return { success: false as const, error: error?.message ?? 'Update failed' }
  }

  const changes = diffTierRows(before as TierRow, after as TierRow)
  if (changes.length > 0) {
    await logAdminAction({
      adminUserId: session.user.id,
      action: ADMIN_ACTIONS.TIER_UPDATED,
      details: {
        tier_slug: tierSlug,
        changes,
      },
    })
  }

  revalidateTierSurfaces()
  return { success: true as const, tier: after }
}

export async function archiveTier(slug: string) {
  const session = await verifySuperAdminSession()
  if (!session.ok) {
    return { success: false as const, status: session.status, error: session.error }
  }

  const rateLimit = await checkServerActionRateLimit(session.user.id, 'archiveTier')
  if (!rateLimit.allowed) {
    return { success: false as const, error: rateLimit.error ?? 'Rate limit exceeded' }
  }

  const slugResult = adminTierSlugParamSchema.safeParse(slug)
  if (!slugResult.success) {
    return { success: false as const, error: 'Invalid tier slug' }
  }

  const supabase = createAdminClient()
  const tierSlug = slugResult.data

  const { data: before, error: fetchError } = await supabase
    .from('tiers')
    .select('*')
    .eq('slug', tierSlug)
    .single()

  if (fetchError || !before) {
    return { success: false as const, error: 'Tier not found' }
  }

  if (before.is_active !== true) {
    return { success: true as const, tier: before }
  }

  const { count: activeCount, error: countError } = await supabase
    .from('tiers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  if (countError) {
    console.error('[archiveTier] count', countError)
    return { success: false as const, error: 'Could not verify active tiers' }
  }

  if ((activeCount ?? 0) <= 1) {
    return {
      success: false as const,
      error: 'Cannot archive the last active tier. Restore another tier first or create a new active tier.',
    }
  }

  const { data: after, error } = await supabase
    .from('tiers')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('slug', tierSlug)
    .select()
    .single()

  if (error || !after) {
    console.error('[archiveTier]', error)
    return { success: false as const, error: error?.message ?? 'Archive failed' }
  }

  const changes = diffTierRows(before as TierRow, after as TierRow)
  await logAdminAction({
    adminUserId: session.user.id,
    action: ADMIN_ACTIONS.TIER_ARCHIVED,
    details: { tier_slug: tierSlug, changes },
  })

  revalidateTierSurfaces()
  return { success: true as const, tier: after }
}

export async function restoreTier(slug: string) {
  const session = await verifySuperAdminSession()
  if (!session.ok) {
    return { success: false as const, status: session.status, error: session.error }
  }

  const rateLimit = await checkServerActionRateLimit(session.user.id, 'restoreTier')
  if (!rateLimit.allowed) {
    return { success: false as const, error: rateLimit.error ?? 'Rate limit exceeded' }
  }

  const slugResult = adminTierSlugParamSchema.safeParse(slug)
  if (!slugResult.success) {
    return { success: false as const, error: 'Invalid tier slug' }
  }

  const supabase = createAdminClient()
  const tierSlug = slugResult.data

  const { data: before, error: fetchError } = await supabase
    .from('tiers')
    .select('*')
    .eq('slug', tierSlug)
    .single()

  if (fetchError || !before) {
    return { success: false as const, error: 'Tier not found' }
  }

  if (before.is_active === true) {
    return { success: true as const, tier: before }
  }

  const { data: after, error } = await supabase
    .from('tiers')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('slug', tierSlug)
    .select()
    .single()

  if (error || !after) {
    console.error('[restoreTier]', error)
    return { success: false as const, error: error?.message ?? 'Restore failed' }
  }

  const changes = diffTierRows(before as TierRow, after as TierRow)
  await logAdminAction({
    adminUserId: session.user.id,
    action: ADMIN_ACTIONS.TIER_RESTORED,
    details: { tier_slug: tierSlug, changes },
  })

  revalidateTierSurfaces()
  return { success: true as const, tier: after }
}

export async function deleteTier(slug: string) {
  const session = await verifySuperAdminSession()
  if (!session.ok) {
    return { success: false as const, status: session.status, error: session.error }
  }

  const rateLimit = await checkServerActionRateLimit(session.user.id, 'deleteTier')
  if (!rateLimit.allowed) {
    return { success: false as const, error: rateLimit.error ?? 'Rate limit exceeded' }
  }

  const slugResult = adminTierSlugParamSchema.safeParse(slug)
  if (!slugResult.success) {
    return { success: false as const, error: 'Invalid tier slug' }
  }

  const supabase = createAdminClient()
  const tierSlug = slugResult.data

  const companyCount = await countCompaniesOnTier(supabase, tierSlug)
  if (companyCount > 0) {
    return {
      success: false as const,
      error: `Cannot delete tier: ${companyCount} compan${companyCount === 1 ? 'y' : 'ies'} ${companyCount === 1 ? 'is' : 'are'} still assigned. Reassign them first.`,
    }
  }

  const { data: before, error: fetchError } = await supabase
    .from('tiers')
    .select('*')
    .eq('slug', tierSlug)
    .single()

  if (fetchError || !before) {
    return { success: false as const, error: 'Tier not found' }
  }

  const { error } = await supabase.from('tiers').delete().eq('slug', tierSlug)

  if (error) {
    console.error('[deleteTier]', error)
    return { success: false as const, error: error.message }
  }

  await logAdminAction({
    adminUserId: session.user.id,
    action: ADMIN_ACTIONS.TIER_DELETED,
    details: {
      tier_slug: tierSlug,
      changes: auditChangesForTierDelete(before as TierRow),
    },
  })

  revalidateTierSurfaces()
  return { success: true as const }
}
