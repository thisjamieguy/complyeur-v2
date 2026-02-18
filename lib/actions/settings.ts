'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { settingsSchema } from '@/lib/validations/settings'
import type { CompanySettings, UpdateSettingsInput } from '@/lib/types/settings'
import { DEFAULT_SETTINGS } from '@/lib/types/settings'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { requireCompanyAccessCached } from '@/lib/security/tenant-access'
import { getCompanySettings as getSettingsFromDb } from '@/lib/db/alerts'

interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Get company settings for the current user's company.
 * Delegates to the cached canonical implementation in lib/db/alerts.ts.
 * Applies defaults for nullable DB columns to match the app-level CompanySettings type.
 */
export async function getCompanySettings(): Promise<CompanySettings | null> {
  try {
    const data = await getSettingsFromDb()
    return {
      ...data,
      retention_months: data.retention_months ?? DEFAULT_SETTINGS.retention_months,
      session_timeout_minutes: data.session_timeout_minutes ?? DEFAULT_SETTINGS.session_timeout_minutes,
      risk_threshold_green: data.risk_threshold_green ?? DEFAULT_SETTINGS.risk_threshold_green,
      risk_threshold_amber: data.risk_threshold_amber ?? DEFAULT_SETTINGS.risk_threshold_amber,
      status_green_max: data.status_green_max ?? DEFAULT_SETTINGS.status_green_max,
      status_amber_max: data.status_amber_max ?? DEFAULT_SETTINGS.status_amber_max,
      status_red_max: data.status_red_max ?? DEFAULT_SETTINGS.status_red_max,
      future_job_warning_threshold: data.future_job_warning_threshold ?? DEFAULT_SETTINGS.future_job_warning_threshold,
      notify_70_days: data.notify_70_days ?? DEFAULT_SETTINGS.notify_70_days,
      notify_85_days: data.notify_85_days ?? DEFAULT_SETTINGS.notify_85_days,
      notify_90_days: data.notify_90_days ?? DEFAULT_SETTINGS.notify_90_days,
      weekly_digest: data.weekly_digest ?? DEFAULT_SETTINGS.weekly_digest,
      custom_alert_threshold: data.custom_alert_threshold ?? DEFAULT_SETTINGS.custom_alert_threshold,
      warning_threshold: data.warning_threshold ?? DEFAULT_SETTINGS.warning_threshold,
      critical_threshold: data.critical_threshold ?? DEFAULT_SETTINGS.critical_threshold,
      email_notifications: data.email_notifications ?? DEFAULT_SETTINGS.email_notifications,
      warning_email_enabled: data.warning_email_enabled ?? DEFAULT_SETTINGS.warning_email_enabled,
      urgent_email_enabled: data.urgent_email_enabled ?? DEFAULT_SETTINGS.urgent_email_enabled,
      breach_email_enabled: data.breach_email_enabled ?? DEFAULT_SETTINGS.breach_email_enabled,
    }
  } catch {
    return null
  }
}

/**
 * Update company settings
 * Only admins can update settings
 */
export async function updateCompanySettings(
  input: UpdateSettingsInput
): Promise<ActionResult> {
  let ctx
  try {
    ctx = await requireCompanyAccessCached()
  } catch {
    return { success: false, error: 'Not authenticated' }
  }

  // Check permission
  if (!ctx.role || !hasPermission(ctx.role, PERMISSIONS.SETTINGS_UPDATE)) {
    return { success: false, error: 'Only owners and admins can update settings' }
  }

  const supabase = await createClient()

  // Validate input
  const currentSettings = await getCompanySettings()
  if (!currentSettings) {
    return { success: false, error: 'Settings not found' }
  }

  const merged = {
    retention_months: input.retention_months ?? currentSettings.retention_months,
    session_timeout_minutes: input.session_timeout_minutes ?? currentSettings.session_timeout_minutes,
    risk_threshold_green: input.risk_threshold_green ?? currentSettings.risk_threshold_green,
    risk_threshold_amber: input.risk_threshold_amber ?? currentSettings.risk_threshold_amber,
    status_green_max: input.status_green_max ?? currentSettings.status_green_max,
    status_amber_max: input.status_amber_max ?? currentSettings.status_amber_max,
    status_red_max: input.status_red_max ?? currentSettings.status_red_max,
    future_job_warning_threshold: input.future_job_warning_threshold ?? currentSettings.future_job_warning_threshold,
    notify_70_days: input.notify_70_days ?? currentSettings.notify_70_days,
    notify_85_days: input.notify_85_days ?? currentSettings.notify_85_days,
    notify_90_days: input.notify_90_days ?? currentSettings.notify_90_days,
    weekly_digest: input.weekly_digest ?? currentSettings.weekly_digest,
    custom_alert_threshold: input.custom_alert_threshold !== undefined
      ? input.custom_alert_threshold
      : currentSettings.custom_alert_threshold,
  }

  const validation = settingsSchema.safeParse(merged)

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'Validation failed',
    }
  }

  // Update settings
  const { error } = await supabase
    .from('company_settings')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', ctx.companyId)

  if (error) {
    console.error('Error updating settings:', error)
    return { success: false, error: 'Failed to save settings' }
  }

  revalidatePath('/settings')
  revalidatePath('/dashboard')  // Revalidate dashboard to reflect new status thresholds
  return { success: true }
}

/**
 * Check if user has permission to view settings
 */
export async function canViewSettings(): Promise<boolean> {
  try {
    const ctx = await requireCompanyAccessCached()
    if (!ctx.role) return false
    return hasPermission(ctx.role, PERMISSIONS.SETTINGS_VIEW)
  } catch {
    return false
  }
}

/**
 * Check if user has permission to update settings
 */
export async function canUpdateSettings(): Promise<boolean> {
  try {
    const ctx = await requireCompanyAccessCached()
    if (!ctx.role) return false
    return hasPermission(ctx.role, PERMISSIONS.SETTINGS_UPDATE)
  } catch {
    return false
  }
}
