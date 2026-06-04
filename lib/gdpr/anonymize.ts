/**
 * @fileoverview Employee Anonymization for GDPR Right to Erasure
 *
 * Implements GDPR Article 17 - Right to Erasure via anonymization.
 *
 * When full deletion isn't possible (e.g., data needed for aggregate
 * compliance statistics or legal record-keeping), anonymization
 * provides an alternative that satisfies GDPR requirements.
 *
 * Anonymization Rules:
 * - Replace name with ANON_[first 8 chars of UUID]
 * - Keep all trip data intact (country, dates, compliance status)
 * - Set anonymized_at timestamp
 * - Log the employee identifier and anonymized label in the audit trail
 *
 * This is an IRREVERSIBLE operation.
 */

import { createClient } from '@/lib/supabase/server'
import {
  createEmployeeAuditLabel,
  logGdprAction,
  type AnonymizeDetails,
} from './audit'
import { requireCompanyAccess } from '@/lib/security/tenant-access'
import { requireOwnerOrAdminMutation } from '@/lib/security/authorization'

/**
 * Result type for anonymization
 */
export interface AnonymizeResult {
  success: true
  employeeId: string
  originalName: string
  anonymizedName: string
  tripsPreserved: number
}

export interface AnonymizeError {
  success: false
  error: string
  code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'ALREADY_ANONYMIZED' | 'DATABASE_ERROR' | 'RATE_LIMIT'
}

/**
 * Generates an anonymized name from an employee UUID.
 *
 * Format: ANON_[first 8 characters of UUID in uppercase]
 *
 * @param employeeId - The employee's UUID
 * @returns Anonymized name string
 */
export function generateAnonymizedName(employeeId: string): string {
  // Take first 8 characters of UUID, uppercase for readability
  const hash = employeeId.replace(/-/g, '').substring(0, 8).toUpperCase()
  return `ANON_${hash}`
}

const REDACTED_ALERT_MESSAGE = 'Compliance alert for anonymized employee'
const REDACTED_NOTIFICATION_SUBJECT = 'Schengen Compliance Alert for anonymized employee'
const REDACTED_NOTIFICATION_RECIPIENT = 'redacted-notification-recipient@complyeur.local'

/**
 * Anonymizes an employee's personal data while preserving trip history.
 *
 * This operation is IRREVERSIBLE.
 *
 * @param employeeId - The employee to anonymize
 * @param reason - Optional reason for anonymization (logged for compliance)
 * @returns Result with anonymization details or error
 *
 * @example
 * ```ts
 * const result = await anonymizeEmployee(employeeId, 'GDPR erasure request')
 * if (result.success) {
 *   console.log(`${result.originalName} is now ${result.anonymizedName}`)
 * }
 * ```
 */
export async function anonymizeEmployee(
  employeeId: string,
  reason?: string
): Promise<AnonymizeResult | AnonymizeError> {
  const supabase = await createClient()

  try {
    const access = await requireOwnerOrAdminMutation(supabase, 'anonymizeEmployee')
    if (!access.allowed) {
      const error =
        access.status === 401
          ? 'Unauthorized - you must be logged in'
          : access.mfaReason
            ? access.error
            : access.status === 403
              ? 'Only owners and administrators can anonymize employees'
              : access.error

      return {
        success: false,
        error,
        code: access.status === 429 ? 'RATE_LIMIT' : 'UNAUTHORIZED',
      }
    }

    // Get employee (RLS ensures company isolation)
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single()

    if (employeeError || !employee) {
      return {
        success: false,
        error: 'Employee not found or access denied',
        code: 'NOT_FOUND',
      }
    }

    const employeeCompanyId = (employee as Record<string, unknown>).company_id as string | null
    if (!employeeCompanyId) {
      return {
        success: false,
        error: 'Employee not found or access denied',
        code: 'NOT_FOUND',
      }
    }

    await requireCompanyAccess(supabase, employeeCompanyId)

    // Check if already anonymized
    if ((employee as Record<string, unknown>).anonymized_at) {
      return {
        success: false,
        error: 'Employee has already been anonymized',
        code: 'ALREADY_ANONYMIZED',
      }
    }

    // Check if already deleted (shouldn't anonymize deleted employees)
    if ((employee as Record<string, unknown>).deleted_at) {
      return {
        success: false,
        error: 'Cannot anonymize a deleted employee. Restore first or wait for automatic purge.',
        code: 'NOT_FOUND',
      }
    }

    // Count trips that will be preserved
    const { count: tripCount } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId)

    const originalName = employee.name
    const anonymizedName = generateAnonymizedName(employeeId)
    const anonymizedAt = new Date().toISOString()

    // Update employee with anonymized data. Email is a direct identifier and
    // must be removed for the anonymized record to be meaningful.
    const { error: updateError } = await supabase
      .from('employees')
      .update({
        name: anonymizedName,
        email: null,
        anonymized_at: anonymizedAt,
        anonymized_by: access.user.id,
      } as Record<string, unknown>)
      .eq('id', employeeId)

    if (updateError) {
      console.error('[Anonymize] Update failed:', updateError)
      return {
        success: false,
        error: 'Failed to anonymize employee',
        code: 'DATABASE_ERROR',
      }
    }

    const { error: alertScrubError } = await supabase
      .from('alerts')
      .update({ message: REDACTED_ALERT_MESSAGE } as Record<string, unknown>)
      .eq('employee_id', employeeId)
      .eq('company_id', access.companyId)

    if (alertScrubError) {
      console.error('[Anonymize] Alert scrub failed:', alertScrubError)
      return {
        success: false,
        error: 'Failed to anonymize employee alert history',
        code: 'DATABASE_ERROR',
      }
    }

    const { error: notificationScrubError } = await supabase
      .from('notification_log')
      .update({
        recipient_email: REDACTED_NOTIFICATION_RECIPIENT,
        subject: REDACTED_NOTIFICATION_SUBJECT,
      } as Record<string, unknown>)
      .eq('employee_id', employeeId)
      .eq('company_id', access.companyId)

    if (notificationScrubError) {
      console.error('[Anonymize] Notification log scrub failed:', notificationScrubError)
      return {
        success: false,
        error: 'Failed to anonymize employee notification history',
        code: 'DATABASE_ERROR',
      }
    }

    // Log a minimized audit record without retaining the original name.
    const auditDetails: AnonymizeDetails = {
      employee_id: employeeId,
      employee_label: createEmployeeAuditLabel(employeeId),
      anonymized_name: anonymizedName,
      reason,
    }

    await logGdprAction({
      companyId: access.companyId,
      userId: access.user.id,
      action: 'ANONYMIZE',
      entityType: 'employee',
      entityId: employeeId,
      details: auditDetails,
    })

    return {
      success: true,
      employeeId,
      originalName,
      anonymizedName,
      tripsPreserved: tripCount ?? 0,
    }
  } catch (error) {
    console.error('[Anonymize] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to anonymize employee',
      code: 'DATABASE_ERROR',
    }
  }
}

/**
 * Checks if an employee name indicates anonymization.
 *
 * @param name - Employee name to check
 * @returns true if the name follows the ANON_XXXXXXXX pattern
 */
export function isAnonymizedName(name: string): boolean {
  return /^ANON_[A-Z0-9]{8}$/.test(name)
}
