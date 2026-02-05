/**
 * TypeScript interfaces for the dashboard compliance view
 * Phase 8: Dashboard & Compliance Status
 */

import type { RiskLevel } from '@/lib/compliance'
import type { NationalityType } from '@/lib/constants/nationality-types'

/**
 * Extended risk level that includes 'exempt' for EU/Schengen citizens
 */
export type EmployeeRiskLevel = RiskLevel | 'exempt'

/**
 * Employee compliance data for dashboard display.
 * Combines employee info with calculated compliance status.
 */
export interface EmployeeCompliance {
  /** Employee UUID */
  id: string
  /** Employee name */
  name: string
  /** Employee nationality type */
  nationality_type: NationalityType
  /** Days used in current 180-day window */
  days_used: number
  /** Days remaining (90 - days_used, can be negative if over limit) */
  days_remaining: number
  /** Risk level based on days remaining, or 'exempt' for EU/Schengen citizens */
  risk_level: EmployeeRiskLevel
  /** Date of most recent trip exit (ISO string) or null if no trips */
  last_trip_date: string | null
  /** Total number of trips for this employee */
  total_trips: number
  /** Whether currently compliant (days_used <= 90) */
  is_compliant: boolean
}

/**
 * Summary statistics for the dashboard header cards
 */
export interface ComplianceStats {
  /** Total number of employees */
  total: number
  /** Number of employees with green status (within green threshold) */
  compliant: number
  /** Number of employees with amber status (within amber threshold) */
  at_risk: number
  /** Number of employees with red status (within red threshold) */
  non_compliant: number
  /** Number of employees with breach status (90+ days used) */
  breach: number
  /** Number of employees exempt from tracking (EU/Schengen citizens) */
  exempt: number
}

/**
 * Status filter options for the dashboard
 */
export type StatusFilter = 'all' | 'green' | 'amber' | 'red' | 'breach' | 'exempt'

/**
 * Sort options for the compliance table
 */
export type SortOption =
  | 'days_remaining_asc'  // Most critical first (default)
  | 'days_remaining_desc' // Most safe first
  | 'name_asc'            // A-Z
  | 'name_desc'           // Z-A
  | 'days_used_desc'      // Most days used first
  | 'days_used_asc'       // Least days used first

/**
 * Configuration for sort options dropdown
 */
export interface SortOptionConfig {
  value: SortOption
  label: string
}

/**
 * Status badge configuration
 */
export interface StatusBadgeConfig {
  bg: string
  text: string
  border: string
  label: string
}
