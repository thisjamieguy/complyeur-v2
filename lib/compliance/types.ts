/**
 * @fileoverview Type definitions for Schengen 90/180-day compliance calculations.
 *
 * These types define the contract for all compliance-related functions.
 * They ensure type safety across the entire compliance engine.
 *
 * @version 2025-01-07
 * @see EU Regulation 610/2013 (Schengen Borders Code)
 */

/**
 * ISO 3166-1 alpha-2 country code.
 * Two uppercase letters representing a country.
 *
 * @example 'FR', 'DE', 'ES'
 */
export type CountryCode = string;

/**
 * Risk level for compliance status.
 * - green: Safe zone (days used within green threshold)
 * - amber: Caution zone (days used within amber threshold)
 * - red: Danger zone (days used within red threshold)
 * - breach: Violation (90+ days used, regardless of settings)
 */
export type RiskLevel = 'green' | 'amber' | 'red' | 'breach';

/**
 * Calculation mode for compliance engine.
 * - audit: Only counts past trips (for current status display)
 * - planning: Counts past AND future trips (for what-if scenarios)
 */
export type CalculationMode = 'audit' | 'planning';

/**
 * Risk level thresholds configuration (days remaining paradigm).
 * Defines the boundaries between green, amber, and red zones.
 * @deprecated Use StatusThresholds for the days-used paradigm
 */
export interface RiskThresholds {
  /** Days remaining for green status (default: 30) */
  readonly green: number;
  /** Days remaining for amber status (default: 10) */
  readonly amber: number;
}

/**
 * Status threshold configuration (days used paradigm).
 * Defines the boundaries between green, amber, red, and breach zones.
 * Used for dashboard status badge display.
 */
export interface StatusThresholds {
  /** Max days used for green status (default: 60) */
  readonly greenMax: number;
  /** Max days used for amber status (default: 75) */
  readonly amberMax: number;
  /** Max days used for red status (default: 89). 90+ is always breach. */
  readonly redMax: number;
}

/**
 * Represents a single trip to a country.
 * Both entry and exit dates are inclusive (each counts as a full day).
 */
export interface Trip {
  /** Date of entry (counts as Day 1, even if entering at 23:59) */
  readonly entryDate: Date;
  /**
   * Date of exit (counts as full day, even if leaving at 00:01).
   * If null/undefined, the trip is considered "active" (currently traveling)
   * and will count through the reference date in calculations.
   */
  readonly exitDate: Date | null;
  /** ISO 3166-1 alpha-2 country code or full country name */
  readonly country: CountryCode;
  /** Optional trip identifier for tracking */
  readonly id?: string;
}

/**
 * Configuration options for compliance calculations.
 */
export interface ComplianceConfig {
  /** Calculation mode: 'audit' for current status, 'planning' for what-if */
  readonly mode: CalculationMode;
  /** The reference date for calculations (usually "today") */
  readonly referenceDate: Date;
  /** Date when compliance tracking started (default: Oct 12, 2025) */
  readonly complianceStartDate?: Date;
  /** Risk level thresholds */
  readonly thresholds?: RiskThresholds;
  /** Maximum days allowed in Schengen within 180-day window (default: 90) */
  readonly limit?: number;
}

/**
 * Result of a compliance calculation for a single reference date.
 */
export interface ComplianceResult {
  /** Reference date for this calculation */
  readonly referenceDate: Date;
  /** Number of days used in the 180-day window */
  readonly daysUsed: number;
  /** Days remaining (90 - daysUsed). Negative if over limit. */
  readonly daysRemaining: number;
  /** Risk level based on days remaining */
  readonly riskLevel: RiskLevel;
  /** Whether the employee is currently compliant */
  readonly isCompliant: boolean;
}

/**
 * Daily compliance status for calendar views.
 */
export interface DailyCompliance {
  /** The date this status applies to */
  readonly date: Date;
  /** Number of days used in the 180-day window for this reference date */
  readonly daysUsed: number;
  /** Days remaining (90 - daysUsed). Negative if over limit. */
  readonly daysRemaining: number;
  /** Risk level based on days remaining */
  readonly riskLevel: RiskLevel;
}

/**
 * Result of earliest safe entry calculation.
 */
export interface SafeEntryResult {
  /** Whether the employee can enter today */
  readonly canEnterToday: boolean;
  /** Earliest date when entry is safe (null if already eligible) */
  readonly earliestSafeDate: Date | null;
  /** Number of days until compliant (0 if already compliant) */
  readonly daysUntilCompliant: number;
  /** Days that will be used if entering on earliestSafeDate */
  readonly daysUsedOnEntry: number;
}

/**
 * Schengen member country metadata.
 */
export interface SchengenMember {
  /** Full country name */
  readonly name: string;
  /** Date when country joined Schengen (ISO string) */
  readonly since: string;
}

/**
 * Schengen microstate metadata.
 */
export interface SchengenMicrostate {
  /** Full country name */
  readonly name: string;
  /** Rationale for inclusion */
  readonly rationale: string;
}

/**
 * Excluded country metadata.
 */
export interface ExcludedCountry {
  /** Full country name */
  readonly name: string;
  /** Reason for exclusion */
  readonly reason: string;
}

/**
 * Complete Schengen membership data structure.
 */
export interface SchengenMembershipData {
  /** Version date of this data (ISO string) */
  readonly version: string;
  /** URL of the EU source for verification */
  readonly sourceUrl: string;
  /** Full Schengen member countries */
  readonly members: Readonly<Record<string, SchengenMember>>;
  /** Microstates with open borders */
  readonly microstates: Readonly<Record<string, SchengenMicrostate>>;
  /** Countries explicitly excluded (common confusion) */
  readonly excluded: Readonly<Record<string, ExcludedCountry>>;
}

/**
 * Input validation result.
 */
export interface ValidationResult {
  /** Whether the input is valid */
  readonly isValid: boolean;
  /** Validation errors (empty if valid) */
  readonly errors: readonly string[];
}
