/**
 * @fileoverview Compliance snapshot data layer for dashboard performance.
 *
 * Snapshots are precomputed compliance statuses stored in the database.
 * They are automatically invalidated when trips change (via database trigger).
 *
 * Dashboard reads snapshots (fast) instead of computing live (slow).
 * Missing snapshots are computed on-demand and stored for future use.
 *
 * NOTE: Requires the 20260109_compliance_snapshots.sql migration to be run.
 * Until then, this module provides graceful degradation (live calculation).
 *
 * @version 2026-01-09
 */

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { requireCompanyAccessCached } from '@/lib/security/tenant-access'
import {
  calculateCompliance,
  isSchengenCountry,
  parseDateOnlyAsUTC,
  type Trip as ComplianceTrip,
  type RiskLevel,
} from '@/lib/compliance'
import { toUTCMidnight } from '@/lib/compliance/date-utils'
import { withDbTiming, trackCacheAccess } from '@/lib/performance'

/**
 * Flag to check if snapshot tables exist.
 * Set to true after running the 20260109_compliance_snapshots.sql migration.
 * Until the migration is run, all calculations will be done live.
 */
const SNAPSHOTS_ENABLED = false

/**
 * Employee with snapshot for dashboard
 */
export interface EmployeeWithSnapshot {
  id: string
  name: string
  days_used: number
  days_remaining: number
  risk_level: RiskLevel
  is_compliant: boolean
  last_trip_date: string | null
  total_trips: number
  snapshot_stale: boolean
}

/**
 * Get employees with their compliance data.
 * Uses snapshots if available, otherwise calculates live.
 *
 * Uses React cache() for request-level deduplication.
 */
export const getEmployeesWithSnapshots = cache(
  async (): Promise<EmployeeWithSnapshot[]> => {
    return withDbTiming('getEmployeesWithSnapshots', async () => {
      const supabase = await createClient()

      // For now, we fetch employees with trips and calculate live
      // After migration runs and SNAPSHOTS_ENABLED is set to true,
      // this can be updated to use the snapshot table
      const { data: employees, error } = await supabase
        .from('employees')
        .select(
          `
          id,
          name,
          trips (
            id,
            country,
            entry_date,
            exit_date,
            ghosted
          )
        `
        )
        .is('deleted_at', null)
        .order('name')

      if (error) {
        console.error('Error fetching employees with snapshots:', error)
        throw new Error('Failed to fetch employees')
      }

      const today = toUTCMidnight(new Date())
      const results: EmployeeWithSnapshot[] = []

      for (const emp of employees ?? []) {
        const trips = (emp.trips ?? []) as Array<{
          id: string
          country: string
          entry_date: string
          exit_date: string
          ghosted: boolean
        }>

        // Filter active trips
        const activeTrips = trips.filter((t) => !t.ghosted)

        // Find most recent trip
        const sortedTrips = [...activeTrips].sort((a, b) =>
          b.exit_date.localeCompare(a.exit_date)
        )
        const lastTrip = sortedTrips[0]

        // Calculate compliance live (snapshots not enabled yet)
        trackCacheAccess('compliance_snapshot', false, emp.id)

        const complianceTrips: ComplianceTrip[] = activeTrips
          .filter((t) => isSchengenCountry(t.country))
          .map((t) => ({
            id: t.id,
            country: t.country,
            entryDate: parseDateOnlyAsUTC(t.entry_date),
            exitDate: parseDateOnlyAsUTC(t.exit_date),
          }))

        const compliance = calculateCompliance(complianceTrips, {
          mode: 'audit',
          referenceDate: today,
        })

        results.push({
          id: emp.id,
          name: emp.name,
          days_used: compliance.daysUsed,
          days_remaining: compliance.daysRemaining,
          risk_level: compliance.riskLevel,
          is_compliant: compliance.isCompliant,
          last_trip_date: lastTrip?.exit_date ?? null,
          total_trips: activeTrips.length,
          snapshot_stale: !SNAPSHOTS_ENABLED, // Always stale when calculating live
        })
      }

      return results
    })
  }
)

/**
 * Force rebuild all snapshots for a company.
 * Used for admin maintenance or after data migrations.
 *
 * NOTE: This is a no-op until the migration is run.
 */
export async function rebuildCompanySnapshots(
  _companyId: string
): Promise<{ updated: number; errors: number }> {
  if (!SNAPSHOTS_ENABLED) {
    console.warn('Snapshots not enabled. Run 20260109_compliance_snapshots.sql migration first.')
    return { updated: 0, errors: 0 }
  }

  // Implementation will be enabled after migration runs
  return { updated: 0, errors: 0 }
}

/**
 * Get dashboard summary.
 * Uses the optimized RPC function after migration, otherwise calculates live.
 */
export const getDashboardSummary = cache(async () => {
  return withDbTiming('getDashboardSummary', async () => {
    const ctx = await requireCompanyAccessCached()
    const supabase = await createClient()

    // Calculate summary from employees and trips (live)
    // After migration, this can use the get_dashboard_summary RPC
    const { data: employees } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', ctx.companyId)
      .is('deleted_at', null)

    const { data: recentTrips } = await supabase
      .from('trips')
      .select(
        `
        id,
        employee_id,
        country,
        entry_date,
        exit_date,
        travel_days,
        employees!inner (
          name,
          company_id
        )
      `
      )
      .eq('employees.company_id', ctx.companyId)
      .eq('ghosted', false)
      .order('entry_date', { ascending: false })
      .limit(5)

    // Get full employee compliance data for at-risk count
    const employeesWithSnapshots = await getEmployeesWithSnapshots()

    const atRiskCount = employeesWithSnapshots.filter(
      (e) => e.risk_level === 'amber' || e.risk_level === 'red'
    ).length

    const nonCompliantCount = employeesWithSnapshots.filter(
      (e) => !e.is_compliant
    ).length

    return {
      total_employees: employees?.length ?? 0,
      at_risk_count: atRiskCount,
      non_compliant_count: nonCompliantCount,
      missing_snapshots: SNAPSHOTS_ENABLED ? 0 : employeesWithSnapshots.length,
      recent_trips: (recentTrips ?? []).map((t) => ({
        id: t.id,
        employee_id: t.employee_id,
        employee_name: (t.employees as { name: string })?.name ?? 'Unknown',
        country: t.country,
        entry_date: t.entry_date,
        exit_date: t.exit_date,
        travel_days: t.travel_days,
      })),
    }
  })
})
