/**
 * @fileoverview Data Retention Auto-Purge for GDPR Storage Limitation
 *
 * Implements GDPR Storage Limitation Principle - data should not be kept
 * longer than necessary.
 *
 * Auto-Purge Rules:
 * 1. Find trips where exit_date < NOW() - retention_months
 * 2. Delete expired trips
 * 3. Find employees with zero remaining trips AND deleted_at older than 30 days
 * 4. Hard delete those employees
 * 5. Log all deletions to audit trail
 *
 * This is designed to run as a daily cron job.
 */

import { subMonths, subDays, format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { logGdprAction, type AutoPurgeDetails } from './audit'
import { hardDeleteEmployee, RECOVERY_PERIOD_DAYS } from './soft-delete'

/**
 * Result of a purge operation for a single company
 */
interface CompanyPurgeResult {
  companyId: string
  companyName: string
  retentionMonths: number
  tripsDeleted: number
  employeesDeleted: number
  errors: string[]
}

/**
 * Overall purge result
 */
export interface PurgeResult {
  success: boolean
  companiesProcessed: number
  totalTripsDeleted: number
  totalEmployeesDeleted: number
  results: CompanyPurgeResult[]
  errors: string[]
  executionTime: number
}

/**
 * Runs the data retention purge for all companies.
 *
 * This should be called from a cron job endpoint.
 *
 * @returns Purge results with statistics
 */
export async function runRetentionPurge(): Promise<PurgeResult> {
  const startTime = Date.now()
  const supabase = await createClient()
  const results: CompanyPurgeResult[] = []
  const globalErrors: string[] = []

  try {
    // Get all companies with their retention settings
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        company_settings (
          retention_months
        )
      `)

    if (companiesError) {
      return {
        success: false,
        companiesProcessed: 0,
        totalTripsDeleted: 0,
        totalEmployeesDeleted: 0,
        results: [],
        errors: [`Failed to fetch companies: ${companiesError.message}`],
        executionTime: Date.now() - startTime,
      }
    }

    if (!companies || companies.length === 0) {
      return {
        success: true,
        companiesProcessed: 0,
        totalTripsDeleted: 0,
        totalEmployeesDeleted: 0,
        results: [],
        errors: [],
        executionTime: Date.now() - startTime,
      }
    }

    // Process each company
    for (const company of companies) {
      // company_settings is an array from the join, get first element
      const settings = company.company_settings as { retention_months: number }[] | null
      const retentionMonths = settings?.[0]?.retention_months ?? 36

      const companyResult = await purgeCompanyData(
        supabase,
        company.id,
        company.name,
        retentionMonths
      )
      results.push(companyResult)
    }

    const totalTrips = results.reduce((sum, r) => sum + r.tripsDeleted, 0)
    const totalEmployees = results.reduce((sum, r) => sum + r.employeesDeleted, 0)

    return {
      success: results.every((r) => r.errors.length === 0),
      companiesProcessed: results.length,
      totalTripsDeleted: totalTrips,
      totalEmployeesDeleted: totalEmployees,
      results,
      errors: globalErrors,
      executionTime: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      companiesProcessed: 0,
      totalTripsDeleted: 0,
      totalEmployeesDeleted: 0,
      results,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      executionTime: Date.now() - startTime,
    }
  }
}

/**
 * Purges expired data for a single company.
 */
async function purgeCompanyData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  companyName: string,
  retentionMonths: number
): Promise<CompanyPurgeResult> {
  const errors: string[] = []
  let tripsDeleted = 0
  let employeesDeleted = 0

  const now = new Date()
  const retentionCutoff = subMonths(now, retentionMonths)
  const softDeleteCutoff = subDays(now, RECOVERY_PERIOD_DAYS)

  try {
    // 1. Delete expired trips
    // Find trips where exit_date is older than retention period
    const { data: expiredTrips, error: tripFetchError } = await supabase
      .from('trips')
      .select('id')
      .eq('company_id', companyId)
      .lt('exit_date', format(retentionCutoff, 'yyyy-MM-dd'))

    if (tripFetchError) {
      errors.push(`Failed to fetch expired trips: ${tripFetchError.message}`)
    } else if (expiredTrips && expiredTrips.length > 0) {
      const tripIds = expiredTrips.map((t) => t.id)

      // Delete in batches to avoid timeout
      const batchSize = 100
      for (let i = 0; i < tripIds.length; i += batchSize) {
        const batch = tripIds.slice(i, i + batchSize)
        const { error: deleteError } = await supabase
          .from('trips')
          .delete()
          .in('id', batch)

        if (deleteError) {
          errors.push(`Failed to delete trip batch: ${deleteError.message}`)
        } else {
          tripsDeleted += batch.length
        }
      }
    }

    // 2. Hard delete employees past recovery period
    // Find employees where deleted_at is older than 30 days
    const { data: expiredEmployees, error: empFetchError } = await supabase
      .from('employees')
      .select('id, name')
      .eq('company_id', companyId)
      .not('deleted_at', 'is', null)
      .lt('deleted_at', softDeleteCutoff.toISOString())

    if (empFetchError) {
      errors.push(`Failed to fetch expired employees: ${empFetchError.message}`)
    } else if (expiredEmployees && expiredEmployees.length > 0) {
      for (const emp of expiredEmployees) {
        const result = await hardDeleteEmployee(emp.id, companyId, true)
        if (result.success) {
          employeesDeleted++
          tripsDeleted += result.tripsDeleted
        } else if (result.error) {
          errors.push(`Failed to delete employee ${emp.name}: ${result.error}`)
        }
      }
    }

    // 3. Find and delete orphaned employees (no trips, no activity)
    // Employees with zero trips and last update older than retention period
    const { data: orphanedEmployees, error: orphanFetchError } = await supabase
      .from('employees')
      .select('id, name, updated_at')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .lt('updated_at', retentionCutoff.toISOString())

    if (orphanFetchError) {
      errors.push(`Failed to fetch orphaned employees: ${orphanFetchError.message}`)
    } else if (orphanedEmployees && orphanedEmployees.length > 0) {
      for (const emp of orphanedEmployees) {
        // Check if employee has any trips
        const { count } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .eq('employee_id', emp.id)

        // Only delete if truly orphaned (no trips)
        if (count === 0) {
          const result = await hardDeleteEmployee(emp.id, companyId, true)
          if (result.success) {
            employeesDeleted++
          } else if (result.error) {
            errors.push(`Failed to delete orphaned employee ${emp.name}: ${result.error}`)
          }
        }
      }
    }

    // 4. Log summary to audit trail
    if (tripsDeleted > 0 || employeesDeleted > 0) {
      const auditDetails: AutoPurgeDetails = {
        employees_deleted: employeesDeleted,
        trips_deleted: tripsDeleted,
        retention_policy_months: retentionMonths,
        purge_date: format(now, 'yyyy-MM-dd'),
      }

      await logGdprAction({
        companyId,
        userId: 'SYSTEM',
        action: 'AUTO_PURGE',
        entityType: 'batch',
        entityId: `purge-${format(now, 'yyyyMMdd')}`,
        details: auditDetails,
      })
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error')
  }

  return {
    companyId,
    companyName,
    retentionMonths,
    tripsDeleted,
    employeesDeleted,
    errors,
  }
}

/**
 * Gets retention statistics for a company (for UI display).
 */
export interface RetentionStats {
  retentionMonths: number
  expiringTripsCount: number
  expiringSoonTripsCount: number // Trips expiring in next 30 days
  pendingDeletionEmployeesCount: number
  oldestTripDate: string | null
}

export async function getRetentionStats(): Promise<RetentionStats | null> {
  const supabase = await createClient()

  // Get user's company
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .single()

  if (!profile?.company_id) {
    return null
  }

  // Get retention setting
  const { data: settings } = await supabase
    .from('company_settings')
    .select('retention_months')
    .eq('company_id', profile.company_id)
    .single()

  const retentionMonths = settings?.retention_months ?? 36

  const now = new Date()
  const retentionCutoff = subMonths(now, retentionMonths)
  const soonCutoff = subMonths(now, retentionMonths - 1) // 1 month before expiry

  // Count expired trips
  const { count: expiringCount } = await supabase
    .from('trips')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', profile.company_id)
    .lt('exit_date', format(retentionCutoff, 'yyyy-MM-dd'))

  // Count trips expiring soon (within next 30 days of retention limit)
  const { count: expiringSoonCount } = await supabase
    .from('trips')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', profile.company_id)
    .gte('exit_date', format(retentionCutoff, 'yyyy-MM-dd'))
    .lt('exit_date', format(soonCutoff, 'yyyy-MM-dd'))

  // Count pending deletion employees
  const softDeleteCutoff = subDays(now, RECOVERY_PERIOD_DAYS)
  const { count: pendingCount } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', profile.company_id)
    .not('deleted_at', 'is', null)
    .lt('deleted_at', softDeleteCutoff.toISOString())

  // Get oldest trip date
  const { data: oldestTrip } = await supabase
    .from('trips')
    .select('exit_date')
    .eq('company_id', profile.company_id)
    .order('exit_date', { ascending: true })
    .limit(1)
    .single()

  return {
    retentionMonths,
    expiringTripsCount: expiringCount ?? 0,
    expiringSoonTripsCount: expiringSoonCount ?? 0,
    pendingDeletionEmployeesCount: pendingCount ?? 0,
    oldestTripDate: oldestTrip?.exit_date ?? null,
  }
}
