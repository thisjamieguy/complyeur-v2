import { createClient } from '@/lib/supabase/server'
import {
  calculateCompliance,
  isSchengenCountry,
  parseDateOnlyAsUTC,
} from '@/lib/compliance'
import { toUTCMidnight } from '@/lib/compliance/date-utils'
import type { Trip as ComplianceTrip } from '@/lib/compliance'
import {
  createAlert,
  getCompanySettings,
  resolveAlertsForEmployee,
  markAlertEmailSent,
  createNotificationLog,
  updateNotificationLogStatus,
  getNotificationRecipients,
} from '@/lib/db/alerts'
import { sendAlertEmail } from './email-service'
import type { AlertType, AlertRiskLevel, Trip, CompanySettings, Alert } from '@/types/database-helpers'
import { logger } from '@/lib/logger.mjs'

interface DetectionContext {
  employeeId: string
  employeeName: string
  companyId: string
}

interface DetectionResult {
  alertsCreated: AlertType[]
  alertsResolved: boolean
  daysUsed: number
  daysRemaining: number
}

/**
 * Map alert type to risk level
 */
function alertTypeToRiskLevel(alertType: AlertType): AlertRiskLevel {
  switch (alertType) {
    case 'breach':
      return 'red'
    case 'urgent':
      return 'red'
    case 'warning':
      return 'amber'
    default:
      return 'green'
  }
}

/**
 * Get alert message for the given type
 */
function getAlertMessage(
  alertType: AlertType,
  employeeName: string,
  daysUsed: number,
  threshold: number
): string {
  switch (alertType) {
    case 'warning':
      return `${employeeName} has used ${daysUsed} of 90 days (crossed ${threshold}-day warning threshold)`
    case 'urgent':
      return `${employeeName} has used ${daysUsed} of 90 days (crossed ${threshold}-day urgent threshold)`
    case 'breach':
      return `${employeeName} has exceeded the 90-day Schengen limit with ${daysUsed} days used`
    default:
      return `Compliance alert for ${employeeName}`
  }
}

/**
 * Convert database trips to compliance engine format
 */
function toComplianceTrips(trips: Trip[]): ComplianceTrip[] {
  return trips
    .filter(trip => !trip.ghosted && isSchengenCountry(trip.country))
    .map(trip => ({
      country: trip.country,
      entryDate: parseDateOnlyAsUTC(trip.entry_date),
      exitDate: parseDateOnlyAsUTC(trip.exit_date),
    }))
}

/**
 * Determine which thresholds have been crossed
 */
function getThresholdsCrossed(
  daysUsed: number,
  settings: CompanySettings
): AlertType[] {
  const crossed: AlertType[] = []

  // Check from highest to lowest priority
  if (daysUsed >= 90) {
    crossed.push('breach')
  }
  if (daysUsed >= (settings.critical_threshold ?? 85)) {
    crossed.push('urgent')
  }
  if (daysUsed >= (settings.warning_threshold ?? 70)) {
    crossed.push('warning')
  }

  return crossed
}

/**
 * Check if email should be sent for this alert type
 */
function shouldSendEmail(
  alertType: AlertType,
  settings: CompanySettings
): boolean {
  if (!settings.email_notifications) {
    return false
  }

  switch (alertType) {
    case 'warning':
      return settings.warning_email_enabled ?? true
    case 'urgent':
      return settings.urgent_email_enabled ?? true
    case 'breach':
      return settings.breach_email_enabled ?? true
    default:
      return false
  }
}

/**
 * Send alert emails to all eligible recipients
 */
async function sendAlertEmails(
  alert: Alert,
  context: DetectionContext,
  daysUsed: number,
  daysRemaining: number,
  settings: CompanySettings
): Promise<void> {
  const alertType = alert.alert_type as 'warning' | 'urgent' | 'breach'

  // Get recipients who want this type of notification
  const recipients = await getNotificationRecipients(alertType)

  if (recipients.length === 0) {
    logger.info('[AlertDetection] No recipients for alert type', { alertType })
    return
  }

  logger.info('[AlertDetection] Sending alert emails', {
    alertType,
    recipientCount: recipients.length,
  })

  // Create all notification logs in parallel
  const logs = await Promise.all(
    recipients.map(recipient =>
      createNotificationLog({
        alert_id: alert.id,
        employee_id: context.employeeId,
        notification_type: alertType,
        recipient_email: recipient.email,
        subject: `[${alertType.charAt(0).toUpperCase() + alertType.slice(1)}] ${context.employeeName} - Schengen Compliance Alert`,
        status: 'pending',
      }).then(log => ({ log, recipient }))
    )
  )

  // Fire off all emails in parallel (non-blocking)
  for (const { log, recipient } of logs) {
    sendAlertEmail({
      employeeName: context.employeeName,
      daysUsed,
      daysRemaining,
      alertType,
      recipientEmail: recipient.email,
      unsubscribeToken: recipient.unsubscribeToken,
    })
      .then(result => {
        if (result.success) {
          updateNotificationLogStatus(log.id, 'sent', {
            resend_message_id: result.messageId,
          })
        } else {
          updateNotificationLogStatus(log.id, 'failed', {
            error_message: result.error,
          })
        }
      })
      .catch(err => {
        updateNotificationLogStatus(log.id, 'failed', {
          error_message: err instanceof Error ? err.message : 'Unknown error',
        })
      })
  }

  // Mark alert as email sent
  await markAlertEmailSent(alert.id)
}

/**
 * Main alert detection function
 *
 * Call this after any trip is created, updated, or deleted
 * to check if new alerts should be created or existing ones resolved
 */
export async function detectAndProcessAlerts(
  context: DetectionContext
): Promise<DetectionResult> {
  const supabase = await createClient()

  // Get company settings for thresholds
  const settings = await getCompanySettings()

  // Get all trips for this employee
  const { data: trips, error } = await supabase
    .from('trips')
    .select('*')
    .eq('employee_id', context.employeeId)

  if (error) {
    logger.error('[AlertDetection] Failed to fetch trips', { error })
    throw error
  }

  // Calculate current compliance status
  const complianceTrips = toComplianceTrips(trips ?? [])
  const result = calculateCompliance(complianceTrips, {
    mode: 'audit',
    referenceDate: toUTCMidnight(new Date()),
  })

  const { daysUsed, daysRemaining } = result
  const thresholdsCrossed = getThresholdsCrossed(daysUsed, settings)

  logger.info('[AlertDetection] Compliance thresholds evaluated', {
    employeeName: context.employeeName,
    daysUsed,
    thresholdsCrossed,
  })

  // Track what we create
  const alertsCreated: AlertType[] = []

  // If compliant (below all thresholds), resolve any existing alerts
  if (thresholdsCrossed.length === 0) {
    const resolved = await resolveAlertsForEmployee(context.employeeId)
    return {
      alertsCreated: [],
      alertsResolved: resolved > 0,
      daysUsed,
      daysRemaining,
    }
  }

  // Create alerts for each crossed threshold (duplicate prevention handled in createAlert)
  for (const alertType of thresholdsCrossed) {
    const threshold =
      alertType === 'breach'
        ? 90
        : alertType === 'urgent'
          ? (settings.critical_threshold ?? 85)
          : (settings.warning_threshold ?? 70)

    const alert = await createAlert({
      employee_id: context.employeeId,
      alert_type: alertType,
      risk_level: alertTypeToRiskLevel(alertType),
      message: getAlertMessage(alertType, context.employeeName, daysUsed, threshold),
      days_used: daysUsed,
    })

    if (alert) {
      alertsCreated.push(alertType)
      logger.info('[AlertDetection] Alert created', {
        alertType,
        employeeName: context.employeeName,
      })

      // Send email if enabled (non-blocking)
      if (shouldSendEmail(alertType, settings)) {
        sendAlertEmails(alert, context, daysUsed, daysRemaining, settings).catch(err => {
          logger.error('[AlertDetection] Failed to send alert emails', { error: err })
        })
      }
    } else {
      logger.info('[AlertDetection] Alert already exists', {
        alertType,
        employeeName: context.employeeName,
      })
    }
  }

  return {
    alertsCreated,
    alertsResolved: false,
    daysUsed,
    daysRemaining,
  }
}

/**
 * Lightweight check if employee has any active alerts
 * (for UI indicators without full detection)
 */
export async function getEmployeeAlertStatus(
  employeeId: string
): Promise<{ hasAlerts: boolean; highestSeverity: AlertType | null }> {
  const supabase = await createClient()

  const { data: alerts, error } = await supabase
    .from('alerts')
    .select('alert_type')
    .eq('employee_id', employeeId)
    .eq('resolved', false)
    .order('created_at', { ascending: false })

  if (error || !alerts || alerts.length === 0) {
    return { hasAlerts: false, highestSeverity: null }
  }

  // Return the highest severity alert
  const severityOrder: AlertType[] = ['breach', 'urgent', 'warning']
  for (const severity of severityOrder) {
    if (alerts.some(a => a.alert_type === severity)) {
      return { hasAlerts: true, highestSeverity: severity }
    }
  }

  return { hasAlerts: true, highestSeverity: alerts[0].alert_type as AlertType }
}

/**
 * Batch check alerts for multiple employees
 * Useful for dashboard views
 */
export async function batchCheckAlerts(
  employeeIds: string[]
): Promise<Map<string, { hasAlerts: boolean; highestSeverity: AlertType | null }>> {
  const supabase = await createClient()

  const { data: alerts, error } = await supabase
    .from('alerts')
    .select('employee_id, alert_type')
    .in('employee_id', employeeIds)
    .eq('resolved', false)

  const result = new Map<string, { hasAlerts: boolean; highestSeverity: AlertType | null }>()

  // Initialize all as no alerts
  for (const id of employeeIds) {
    result.set(id, { hasAlerts: false, highestSeverity: null })
  }

  if (error || !alerts) {
    return result
  }

  // Group by employee and find highest severity
  const severityOrder: AlertType[] = ['breach', 'urgent', 'warning']

  for (const alert of alerts) {
    const current = result.get(alert.employee_id)
    if (!current) continue

    if (!current.hasAlerts) {
      result.set(alert.employee_id, {
        hasAlerts: true,
        highestSeverity: alert.alert_type as AlertType,
      })
    } else {
      // Check if this is higher severity
      const currentIndex = severityOrder.indexOf(current.highestSeverity!)
      const newIndex = severityOrder.indexOf(alert.alert_type as AlertType)
      if (newIndex < currentIndex) {
        result.set(alert.employee_id, {
          hasAlerts: true,
          highestSeverity: alert.alert_type as AlertType,
        })
      }
    }
  }

  return result
}
