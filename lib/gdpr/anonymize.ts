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
 * - Log original name in audit (for regulatory proof)
 *
 * This is an IRREVERSIBLE operation.
 */

import { createClient } from '@/lib/supabase/server'
import { logGdprAction, type AnonymizeDetails } from './audit'

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
  code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'ALREADY_ANONYMIZED' | 'DATABASE_ERROR'
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

/**
 * Anonymizes an employee's personal data while preserving trip history.
 *
 * This operation is IRREVERSIBLE. The original name is logged to the
 * audit trail for regulatory compliance.
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
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'Unauthorized - you must be logged in',
        code: 'UNAUTHORIZED',
      }
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        error: 'Could not find your profile',
        code: 'DATABASE_ERROR',
      }
    }

    // Check admin permission
    if (profile.role !== 'admin') {
      return {
        success: false,
        error: 'Only administrators can anonymize employees',
        code: 'UNAUTHORIZED',
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

    // Update employee with anonymized data
    const { error: updateError } = await supabase
      .from('employees')
      .update({
        name: anonymizedName,
        anonymized_at: anonymizedAt,
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

    // Log to audit trail with ORIGINAL name for regulatory compliance
    const auditDetails: AnonymizeDetails = {
      original_name: originalName,
      anonymized_name: anonymizedName,
      reason,
    }

    await logGdprAction({
      companyId: profile.company_id ?? '',
      userId: user.id,
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
