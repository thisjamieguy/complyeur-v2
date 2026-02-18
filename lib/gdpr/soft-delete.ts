/**
 * @fileoverview Soft Delete Implementation for GDPR Right to Erasure
 *
 * Implements GDPR Article 17 - Right to Erasure with a 30-day recovery period.
 *
 * Soft Delete Flow:
 * 1. Set deleted_at timestamp on employee
 * 2. Employee hidden from normal UI queries
 * 3. Trips remain linked (employee_id still valid)
 * 4. After 30 days, auto-purge job performs hard delete
 * 5. All stages logged to audit trail
 *
 * Restore Flow:
 * 1. Admin can restore within 30 days
 * 2. Set deleted_at = NULL
 * 3. Employee reappears in UI
 * 4. Restore action logged
 */

import { addDays, format, differenceInDays } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import {
  logGdprAction,
  type SoftDeleteDetails,
  type RestoreDetails,
  type HardDeleteDetails,
} from './audit'
import { RECOVERY_PERIOD_DAYS } from './constants'
import { requireCompanyAccess } from '@/lib/security/tenant-access'
import { isOwnerOrAdmin } from '@/lib/permissions'

// Re-export for convenience
export { RECOVERY_PERIOD_DAYS }

/**
 * Result type for soft delete operations
 */
export interface SoftDeleteResult {
  success: true
  employeeId: string
  employeeName: string
  deletedAt: string
  scheduledHardDelete: string
  affectedTripsCount: number
}

export interface SoftDeleteError {
  success: false
  error: string
  code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'ALREADY_DELETED' | 'DATABASE_ERROR'
}

/**
 * Soft deletes an employee, marking them for permanent deletion after 30 days.
 *
 * @param employeeId - The employee to soft delete
 * @param reason - Optional reason for the deletion (logged for compliance)
 * @returns Result with deletion details or error
 *
 * @example
 * ```ts
 * const result = await softDeleteEmployee(employeeId, 'Employee resignation')
 * if (result.success) {
 *   console.log(`Deleted ${result.employeeName}, will be permanently removed on ${result.scheduledHardDelete}`)
 * }
 * ```
 */
export async function softDeleteEmployee(
  employeeId: string,
  reason?: string
): Promise<SoftDeleteResult | SoftDeleteError> {
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

    // Check owner/admin permission
    if (!isOwnerOrAdmin(profile.role)) {
      return {
        success: false,
        error: 'Only owners and administrators can delete employees',
        code: 'UNAUTHORIZED',
      }
    }

    // Get employee (RLS ensures company isolation)
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, name, company_id, deleted_at')
      .eq('id', employeeId)
      .single()

    if (employeeError || !employee) {
      return {
        success: false,
        error: 'Employee not found or access denied',
        code: 'NOT_FOUND',
      }
    }

    const employeeCompanyId = employee.company_id as string | null
    if (!employeeCompanyId) {
      return {
        success: false,
        error: 'Employee not found or access denied',
        code: 'NOT_FOUND',
      }
    }

    await requireCompanyAccess(supabase, employeeCompanyId)

    // Check if already deleted
    if (employee.deleted_at) {
      return {
        success: false,
        error: 'Employee is already marked for deletion',
        code: 'ALREADY_DELETED',
      }
    }

    // Count affected trips
    const { count: tripCount } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId)

    const now = new Date()
    const deletedAt = now.toISOString()
    const scheduledHardDelete = addDays(now, RECOVERY_PERIOD_DAYS)

    // Update employee with deleted_at
    const { error: updateError } = await supabase
      .from('employees')
      .update({ deleted_at: deletedAt } as Record<string, unknown>)
      .eq('id', employeeId)

    if (updateError) {
      console.error('[SoftDelete] Update failed:', updateError)
      return {
        success: false,
        error: 'Failed to delete employee',
        code: 'DATABASE_ERROR',
      }
    }

    // Log to audit trail
    const auditDetails: SoftDeleteDetails = {
      employee_name: employee.name,
      affected_trips_count: tripCount ?? 0,
      scheduled_hard_delete: scheduledHardDelete.toISOString(),
      reason,
    }

    await logGdprAction({
      companyId: profile.company_id ?? '',
      userId: user.id,
      action: 'SOFT_DELETE',
      entityType: 'employee',
      entityId: employeeId,
      details: auditDetails,
    })

    return {
      success: true,
      employeeId,
      employeeName: employee.name,
      deletedAt,
      scheduledHardDelete: format(scheduledHardDelete, 'yyyy-MM-dd'),
      affectedTripsCount: tripCount ?? 0,
    }
  } catch (error) {
    console.error('[SoftDelete] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete employee',
      code: 'DATABASE_ERROR',
    }
  }
}

/**
 * Result type for restore operations
 */
export interface RestoreResult {
  success: true
  employeeId: string
  employeeName: string
  daysUntilHardDelete: number
}

export interface RestoreError {
  success: false
  error: string
  code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'NOT_DELETED' | 'EXPIRED' | 'DATABASE_ERROR'
}

/**
 * Restores a soft-deleted employee within the recovery period.
 *
 * @param employeeId - The employee to restore
 * @returns Result with restore details or error
 *
 * @example
 * ```ts
 * const result = await restoreEmployee(employeeId)
 * if (result.success) {
 *   console.log(`Restored ${result.employeeName}`)
 * }
 * ```
 */
export async function restoreEmployee(
  employeeId: string
): Promise<RestoreResult | RestoreError> {
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

    // Get user's profile (profiles don't have email - use auth.users email)
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

    // Check owner/admin permission
    if (!isOwnerOrAdmin(profile.role)) {
      return {
        success: false,
        error: 'Only owners and administrators can restore employees',
        code: 'UNAUTHORIZED',
      }
    }

    // Get employee including deleted ones
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

    const deletedAt = (employee as Record<string, unknown>).deleted_at as string | null

    // Check if actually deleted
    if (!deletedAt) {
      return {
        success: false,
        error: 'Employee is not deleted',
        code: 'NOT_DELETED',
      }
    }

    // Check if within recovery period
    const deletedDate = new Date(deletedAt)
    const now = new Date()
    const daysSinceDelete = differenceInDays(now, deletedDate)

    if (daysSinceDelete > RECOVERY_PERIOD_DAYS) {
      return {
        success: false,
        error: `Recovery period expired. Employee was deleted ${daysSinceDelete} days ago.`,
        code: 'EXPIRED',
      }
    }

    const daysUntilHardDelete = RECOVERY_PERIOD_DAYS - daysSinceDelete

    // Clear deleted_at to restore
    const { error: updateError } = await supabase
      .from('employees')
      .update({ deleted_at: null } as Record<string, unknown>)
      .eq('id', employeeId)

    if (updateError) {
      console.error('[Restore] Update failed:', updateError)
      return {
        success: false,
        error: 'Failed to restore employee',
        code: 'DATABASE_ERROR',
      }
    }

    // Log to audit trail
    const auditDetails: RestoreDetails = {
      employee_name: employee.name,
      days_until_hard_delete: daysUntilHardDelete,
      restored_by: user.email ?? 'unknown',
    }

    await logGdprAction({
      companyId: profile.company_id ?? '',
      userId: user.id,
      action: 'RESTORE',
      entityType: 'employee',
      entityId: employeeId,
      details: auditDetails,
    })

    return {
      success: true,
      employeeId,
      employeeName: employee.name,
      daysUntilHardDelete,
    }
  } catch (error) {
    console.error('[Restore] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore employee',
      code: 'DATABASE_ERROR',
    }
  }
}

/**
 * Deleted employee info for UI display
 */
export interface DeletedEmployee {
  id: string
  name: string
  deletedAt: string
  daysRemaining: number
  canRestore: boolean
}

/**
 * Gets all soft-deleted employees for the current company.
 *
 * @returns Array of deleted employees with recovery info
 */
export async function getDeletedEmployees(): Promise<DeletedEmployee[]> {
  const supabase = await createClient()

  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, name, deleted_at')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) {
    // If deleted_at column doesn't exist, return empty array (GDPR migration not applied)
    if (error.code === '42703') {
      console.warn('[GetDeletedEmployees] deleted_at column not found - GDPR migration may not be applied')
      return []
    }
    console.error('[GetDeletedEmployees] Error:', error)
    return []
  }

  const now = new Date()

  return (employees ?? []).map((emp) => {
    const deletedAt = (emp as Record<string, unknown>).deleted_at as string
    const deletedDate = new Date(deletedAt)
    const daysSinceDelete = differenceInDays(now, deletedDate)
    const daysRemaining = Math.max(0, RECOVERY_PERIOD_DAYS - daysSinceDelete)

    return {
      id: emp.id,
      name: emp.name,
      deletedAt: format(deletedDate, 'yyyy-MM-dd HH:mm'),
      daysRemaining,
      canRestore: daysRemaining > 0,
    }
  })
}

/**
 * Hard deletes an employee and all their trips.
 * This is called by the auto-purge job after the recovery period.
 *
 * @param employeeId - The employee to permanently delete
 * @param companyId - The company ID (for audit logging when called from cron)
 * @param isAutoPurge - Whether this is an automated purge (vs manual)
 * @returns Number of trips deleted along with the employee
 */
export async function hardDeleteEmployee(
  employeeId: string,
  companyId: string,
  isAutoPurge: boolean = true
): Promise<{ success: boolean; tripsDeleted: number; error?: string }> {
  const supabase = await createClient()

  try {
    // Get employee info for audit log
    const { data: employee, error: fetchError } = await supabase
      .from('employees')
      .select('id, name, company_id')
      .eq('id', employeeId)
      .single()

    if (fetchError || !employee) {
      return { success: false, tripsDeleted: 0, error: 'Employee not found' }
    }

    if (employee.company_id !== companyId) {
      return { success: false, tripsDeleted: 0, error: 'Employee not found' }
    }

    // Count trips before deletion
    const { count: tripCount } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId)

    // Delete employee (trips cascade due to FK)
    const { error: deleteError } = await supabase
      .from('employees')
      .delete()
      .eq('id', employeeId)

    if (deleteError) {
      console.error('[HardDelete] Delete failed:', deleteError)
      return { success: false, tripsDeleted: 0, error: deleteError.message }
    }

    // Log to audit trail
    // Note: For auto-purge, we use a system user ID
    const auditDetails: HardDeleteDetails = {
      employee_name: employee.name,
      trips_deleted: tripCount ?? 0,
      deletion_type: isAutoPurge ? 'auto_purge' : 'manual',
    }

    await logGdprAction({
      companyId,
      userId: 'SYSTEM', // System-initiated action
      action: 'HARD_DELETE',
      entityType: 'employee',
      entityId: employeeId,
      details: auditDetails,
    })

    return { success: true, tripsDeleted: tripCount ?? 0 }
  } catch (error) {
    console.error('[HardDelete] Error:', error)
    return {
      success: false,
      tripsDeleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
