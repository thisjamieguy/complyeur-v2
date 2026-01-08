'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { settingsSchema } from '@/lib/validations/settings'
import type { CompanySettings, UpdateSettingsInput } from '@/lib/types/settings'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'

interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Get company settings for the current user's company
 */
export async function getCompanySettings(): Promise<CompanySettings | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get user's company_id from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return null

  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .eq('company_id', profile.company_id)
    .single()

  if (error) {
    // If no settings exist, return defaults
    if (error.code === 'PGRST116') {
      return {
        company_id: profile.company_id,
        retention_months: 36,
        session_timeout_minutes: 30,
        risk_threshold_green: 30,
        risk_threshold_amber: 10,
        future_job_warning_threshold: 80,
        notify_70_days: true,
        notify_85_days: true,
        notify_90_days: true,
        weekly_digest: false,
        custom_alert_threshold: null,
        warning_threshold: 70,
        critical_threshold: 85,
        email_notifications: true,
        warning_email_enabled: true,
        urgent_email_enabled: true,
        breach_email_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }
    console.error('Error fetching settings:', error)
    return null
  }

  // Return with defaults for any missing new columns
  return {
    ...data,
    session_timeout_minutes: data.session_timeout_minutes ?? 30,
    risk_threshold_green: data.risk_threshold_green ?? 30,
    risk_threshold_amber: data.risk_threshold_amber ?? 10,
    future_job_warning_threshold: data.future_job_warning_threshold ?? 80,
    notify_70_days: data.notify_70_days ?? true,
    notify_85_days: data.notify_85_days ?? true,
    notify_90_days: data.notify_90_days ?? true,
    weekly_digest: data.weekly_digest ?? false,
    custom_alert_threshold: data.custom_alert_threshold ?? null,
  } as CompanySettings
}

/**
 * Update company settings
 * Only admins can update settings
 */
export async function updateCompanySettings(
  input: UpdateSettingsInput
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get user's company_id and verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return { success: false, error: 'Company not found' }
  }

  // Check permission
  if (!hasPermission(profile.role, PERMISSIONS.SETTINGS_UPDATE)) {
    return { success: false, error: 'Only admins can update settings' }
  }

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
    .eq('company_id', profile.company_id)

  if (error) {
    console.error('Error updating settings:', error)
    return { success: false, error: 'Failed to save settings' }
  }

  revalidatePath('/settings')
  return { success: true }
}

/**
 * Check if user has permission to view settings
 */
export async function canViewSettings(): Promise<boolean> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role) return false

  return hasPermission(profile.role, PERMISSIONS.SETTINGS_VIEW)
}

/**
 * Check if user has permission to update settings
 */
export async function canUpdateSettings(): Promise<boolean> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role) return false

  return hasPermission(profile.role, PERMISSIONS.SETTINGS_UPDATE)
}
