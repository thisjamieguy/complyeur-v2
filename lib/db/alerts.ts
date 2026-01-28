import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DatabaseError, NotFoundError } from '@/lib/errors'
import { requireCompanyAccess } from '@/lib/security/tenant-access'
import type {
  Alert,
  AlertInsert,
  AlertUpdate,
  AlertWithEmployee,
  AlertType,
  CompanySettings,
  CompanySettingsUpdate,
  NotificationLog,
  NotificationLogInsert,
  NotificationPreferences,
  NotificationPreferencesUpdate,
} from '@/types/database-helpers'

interface AuthContext {
  userId: string
  companyId: string
}

/**
 * Verify user is authenticated and get their company_id
 */
async function getAuthenticatedUserCompany(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<AuthContext> {
  const { userId, companyId } = await requireCompanyAccess(supabase)
  return { userId, companyId }
}

// ============================================================================
// ALERTS CRUD
// ============================================================================

/**
 * Get all active (unresolved) alerts for the company
 */
export async function getActiveAlerts(): Promise<AlertWithEmployee[]> {
  const supabase = await createClient()
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  const { data, error } = await supabase
    .from('alerts')
    .select(`
      *,
      employee:employees!inner(id, name, deleted_at)
    `)
    .eq('company_id', companyId)
    .eq('resolved', false)
    .is('employees.deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching alerts:', error)
    throw new DatabaseError('Failed to fetch alerts')
  }

  return (data ?? []) as AlertWithEmployee[]
}

/**
 * Get unacknowledged alerts for the company (for banner display)
 */
export async function getUnacknowledgedAlerts(): Promise<AlertWithEmployee[]> {
  const supabase = await createClient()
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  const { data, error } = await supabase
    .from('alerts')
    .select(`
      *,
      employee:employees!inner(id, name, deleted_at)
    `)
    .eq('company_id', companyId)
    .eq('resolved', false)
    .eq('acknowledged', false)
    .is('employees.deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching unacknowledged alerts:', error)
    throw new DatabaseError('Failed to fetch alerts')
  }

  return (data ?? []) as AlertWithEmployee[]
}

/**
 * Get alerts for a specific employee
 */
export async function getAlertsByEmployeeId(employeeId: string): Promise<Alert[]> {
  const supabase = await createClient()
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  // Verify employee belongs to company
  const { data: employee } = await supabase
    .from('employees')
    .select('company_id')
    .eq('id', employeeId)
    .single()

  if (!employee || employee.company_id !== companyId) {
    return []
  }

  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching employee alerts:', error)
    throw new DatabaseError('Failed to fetch alerts')
  }

  return data ?? []
}

/**
 * Check if an active alert of the given type already exists for an employee
 */
export async function hasActiveAlertOfType(
  employeeId: string,
  alertType: AlertType
): Promise<boolean> {
  const supabase = await createClient()
  await getAuthenticatedUserCompany(supabase)

  const { data, error } = await supabase
    .from('alerts')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('alert_type', alertType)
    .eq('resolved', false)
    .limit(1)

  if (error) {
    console.error('Error checking existing alert:', error)
    return false
  }

  return (data?.length ?? 0) > 0
}

/**
 * Create a new alert
 * Returns null if alert already exists (duplicate prevention)
 */
export async function createAlert(alert: Omit<AlertInsert, 'company_id'>): Promise<Alert | null> {
  const supabase = await createClient()
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  // Check for existing active alert of same type
  const exists = await hasActiveAlertOfType(alert.employee_id, alert.alert_type as AlertType)
  if (exists) {
    return null // Duplicate prevention
  }

  const { data, error } = await supabase
    .from('alerts')
    .insert({ ...alert, company_id: companyId })
    .select()
    .single()

  if (error) {
    // Handle unique constraint violation gracefully
    if (error.code === '23505') {
      return null // Duplicate
    }
    console.error('Error creating alert:', error)
    throw new DatabaseError('Failed to create alert')
  }

  return data
}

/**
 * Acknowledge an alert (mark as read)
 */
export async function acknowledgeAlert(alertId: string): Promise<Alert> {
  const supabase = await createClient()
  const { userId, companyId } = await getAuthenticatedUserCompany(supabase)

  // Verify alert belongs to company
  const { data: existing } = await supabase
    .from('alerts')
    .select('company_id')
    .eq('id', alertId)
    .single()

  if (!existing || existing.company_id !== companyId) {
    throw new NotFoundError('Alert not found')
  }

  const { data, error } = await supabase
    .from('alerts')
    .update({
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: userId,
    })
    .eq('id', alertId)
    .select()
    .single()

  if (error) {
    console.error('Error acknowledging alert:', error)
    throw new DatabaseError('Failed to acknowledge alert')
  }

  return data
}

/**
 * Resolve an alert
 */
export async function resolveAlert(alertId: string): Promise<Alert> {
  const supabase = await createClient()
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  // Verify alert belongs to company
  const { data: existing } = await supabase
    .from('alerts')
    .select('company_id')
    .eq('id', alertId)
    .single()

  if (!existing || existing.company_id !== companyId) {
    throw new NotFoundError('Alert not found')
  }

  const { data, error } = await supabase
    .from('alerts')
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', alertId)
    .select()
    .single()

  if (error) {
    console.error('Error resolving alert:', error)
    throw new DatabaseError('Failed to resolve alert')
  }

  return data
}

/**
 * Resolve all alerts for an employee (when they become compliant)
 */
export async function resolveAlertsForEmployee(employeeId: string): Promise<number> {
  const supabase = await createClient()
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  // Verify employee belongs to company
  const { data: employee } = await supabase
    .from('employees')
    .select('company_id')
    .eq('id', employeeId)
    .single()

  if (!employee || employee.company_id !== companyId) {
    throw new NotFoundError('Employee not found')
  }

  const { data, error } = await supabase
    .from('alerts')
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
    })
    .eq('employee_id', employeeId)
    .eq('resolved', false)
    .select()

  if (error) {
    console.error('Error resolving alerts:', error)
    throw new DatabaseError('Failed to resolve alerts')
  }

  return data?.length ?? 0
}

/**
 * Mark alert as email sent
 */
export async function markAlertEmailSent(alertId: string): Promise<void> {
  const supabase = await createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('alerts')
    .select('company_id')
    .eq('id', alertId)
    .single()

  if (fetchError || !existing) {
    throw new NotFoundError('Alert not found')
  }

  await requireCompanyAccess(supabase, existing.company_id)

  const { error } = await supabase
    .from('alerts')
    .update({ email_sent: true })
    .eq('id', alertId)

  if (error) {
    console.error('Error marking alert email sent:', error)
  }
}

// ============================================================================
// COMPANY SETTINGS
// ============================================================================

/**
 * Get company settings (creates default if not exists)
 */
export async function getCompanySettings(): Promise<CompanySettings> {
  const supabase = await createClient()
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching company settings:', error)
    throw new DatabaseError('Failed to fetch settings')
  }

  // Create default settings if they don't exist
  if (!data) {
    const { data: newSettings, error: insertError } = await supabase
      .from('company_settings')
      .insert({
        company_id: companyId,
        retention_months: 36,
        warning_threshold: 70,
        critical_threshold: 85,
        email_notifications: true,
        warning_email_enabled: true,
        urgent_email_enabled: true,
        breach_email_enabled: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating company settings:', insertError)
      throw new DatabaseError('Failed to create settings')
    }

    return newSettings
  }

  return data
}

/**
 * Update company settings
 */
export async function updateCompanySettings(
  updates: CompanySettingsUpdate
): Promise<CompanySettings> {
  const supabase = await createClient()
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  // Ensure settings exist first
  await getCompanySettings()

  const { data, error } = await supabase
    .from('company_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .select()
    .single()

  if (error) {
    console.error('Error updating company settings:', error)
    if (error.code === '23514') {
      throw new DatabaseError('Invalid threshold values. Warning must be less than critical, and critical must be less than 90.')
    }
    throw new DatabaseError('Failed to update settings')
  }

  return data
}

// ============================================================================
// NOTIFICATION LOG
// ============================================================================

/**
 * Create a notification log entry
 */
export async function createNotificationLog(
  log: Omit<NotificationLogInsert, 'company_id'>
): Promise<NotificationLog> {
  const supabase = await createClient()
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  const { data, error } = await supabase
    .from('notification_log')
    .insert({ ...log, company_id: companyId })
    .select()
    .single()

  if (error) {
    console.error('Error creating notification log:', error)
    throw new DatabaseError('Failed to log notification')
  }

  return data
}

/**
 * Update notification log status (after email sent)
 */
export async function updateNotificationLogStatus(
  logId: string,
  status: 'sent' | 'failed' | 'bounced',
  details?: { resend_message_id?: string; error_message?: string }
): Promise<void> {
  const supabase = await createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('notification_log')
    .select('company_id')
    .eq('id', logId)
    .single()

  if (fetchError || !existing) {
    throw new NotFoundError('Notification log not found')
  }

  await requireCompanyAccess(supabase, existing.company_id)

  const { error } = await supabase
    .from('notification_log')
    .update({
      status,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      resend_message_id: details?.resend_message_id,
      error_message: details?.error_message,
    })
    .eq('id', logId)

  if (error) {
    console.error('Error updating notification log:', error)
  }
}

/**
 * Get recent notification logs for the company
 */
export async function getNotificationLogs(limit = 50): Promise<NotificationLog[]> {
  const supabase = await createClient()
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  const { data, error } = await supabase
    .from('notification_log')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching notification logs:', error)
    throw new DatabaseError('Failed to fetch notification logs')
  }

  return data ?? []
}

// ============================================================================
// NOTIFICATION PREFERENCES (per-user)
// ============================================================================

/**
 * Get user's notification preferences (creates default if not exists)
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const supabase = await createClient()
  const { userId, companyId } = await getAuthenticatedUserCompany(supabase)

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching notification preferences:', error)
    throw new DatabaseError('Failed to fetch preferences')
  }

  // Create default preferences if they don't exist
  if (!data) {
    const { data: newPrefs, error: insertError } = await supabase
      .from('notification_preferences')
      .insert({
        user_id: userId,
        company_id: companyId,
        receive_warning_emails: true,
        receive_urgent_emails: true,
        receive_breach_emails: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating notification preferences:', insertError)
      throw new DatabaseError('Failed to create preferences')
    }

    return newPrefs
  }

  return data
}

/**
 * Update user's notification preferences
 */
export async function updateNotificationPreferences(
  updates: NotificationPreferencesUpdate
): Promise<NotificationPreferences> {
  const supabase = await createClient()
  const { userId } = await getAuthenticatedUserCompany(supabase)

  // Ensure preferences exist first
  await getNotificationPreferences()

  const { data, error } = await supabase
    .from('notification_preferences')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating notification preferences:', error)
    throw new DatabaseError('Failed to update preferences')
  }

  return data
}

/**
 * Get all users in a company who should receive a specific notification type
 *
 * This function uses batch queries to avoid N+1 performance issues.
 * Uses admin client to fetch emails from auth.users since profiles don't store email.
 */
export async function getNotificationRecipients(
  notificationType: 'warning' | 'urgent' | 'breach'
): Promise<Array<{ email: string; userId: string; unsubscribeToken: string }>> {
  const supabase = await createClient()
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  // Batch fetch: Get all profiles with their notification preferences in a single query
  const { data: profilesWithPrefs, error } = await supabase
    .from('profiles')
    .select(`
      id,
      notification_preferences (
        receive_warning_emails,
        receive_urgent_emails,
        receive_breach_emails,
        unsubscribed_at,
        unsubscribe_token
      )
    `)
    .eq('company_id', companyId)

  if (error || !profilesWithPrefs) {
    console.error('Error fetching profiles with preferences:', error)
    return []
  }

  // Get user IDs for batch email lookup
  const userIds = profilesWithPrefs.map(p => p.id)

  if (userIds.length === 0) {
    return []
  }

  // Batch fetch emails from auth.users using admin client
  const emailMap: Map<string, string> = new Map()
  try {
    const adminClient = createAdminClient()
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers({
      perPage: 1000, // Should be enough for most companies
    })

    if (authError) {
      console.error('Error fetching auth users:', authError)
      return []
    }

    // Create lookup map of user ID -> email
    for (const user of authUsers.users) {
      if (user.email && userIds.includes(user.id)) {
        emailMap.set(user.id, user.email)
      }
    }
  } catch (adminError) {
    // Admin client may not be configured in all environments
    console.error('Error using admin client for email lookup:', adminError)
    return []
  }

  // Process results in memory (no additional queries needed)
  const recipients: Array<{ email: string; userId: string; unsubscribeToken: string }> = []

  for (const profile of profilesWithPrefs) {
    // Get email from our lookup map
    const email = emailMap.get(profile.id)
    if (!email) {
      continue
    }

    // Get preferences (might be null if user hasn't set any)
    const prefs = Array.isArray(profile.notification_preferences)
      ? profile.notification_preferences[0]
      : profile.notification_preferences

    // Check if user has unsubscribed entirely
    if (prefs?.unsubscribed_at) {
      continue
    }

    // Check type-specific preference (default to true if no preferences set)
    const shouldReceive =
      notificationType === 'warning'
        ? prefs?.receive_warning_emails !== false
        : notificationType === 'urgent'
          ? prefs?.receive_urgent_emails !== false
          : prefs?.receive_breach_emails !== false

    if (shouldReceive) {
      recipients.push({
        email,
        userId: profile.id,
        unsubscribeToken: prefs?.unsubscribe_token ?? '',
      })
    }
  }

  return recipients
}
