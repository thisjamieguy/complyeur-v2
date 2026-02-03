/**
 * @fileoverview Schengen 90/180-Day Compliance Engine - Public API
 *
 * This module exports all public functions and types for calculating
 * Schengen Area compliance according to EU Regulation 610/2013.
 *
 * ## Quick Start
 *
 * ```typescript
 * import {
 *   presenceDays,
 *   daysUsedInWindow,
 *   calculateDaysRemaining,
 *   getRiskLevel,
 *   isSchengenCountry,
 * } from '@/lib/compliance';
 *
 * // Calculate compliance for an employee
 * const trips = [
 *   { entryDate: new Date('2025-01-01'), exitDate: new Date('2025-01-10'), country: 'FR' },
 *   { entryDate: new Date('2025-02-15'), exitDate: new Date('2025-02-20'), country: 'DE' },
 * ];
 *
 * const config = {
 *   mode: 'audit' as const,
 *   referenceDate: new Date(),
 * };
 *
 * const presence = presenceDays(trips, config);
 * const daysUsed = daysUsedInWindow(presence, config.referenceDate);
 * const remaining = calculateDaysRemaining(presence, config.referenceDate);
 * const risk = getRiskLevel(remaining);
 * ```
 *
 * @version 2025-01-07
 * @see EU Regulation 610/2013 (Schengen Borders Code)
 */

// ============================================================================
// Types
// ============================================================================

export type {
  CountryCode,
  RiskLevel,
  CalculationMode,
  RiskThresholds,
  StatusThresholds,
  Trip,
  ComplianceConfig,
  ComplianceResult,
  DailyCompliance,
  SafeEntryResult,
  SchengenMember,
  SchengenMicrostate,
  ExcludedCountry,
  SchengenMembershipData,
  ValidationResult,
} from './types';

// ============================================================================
// Errors
// ============================================================================

export {
  ComplianceError,
  InvalidTripError,
  InvalidDateRangeError,
  UnknownCountryError,
  InvalidReferenceDateError,
  InvalidConfigError,
} from './errors';

// ============================================================================
// Constants
// ============================================================================

export {
  DEFAULT_COMPLIANCE_START_DATE,
  SCHENGEN_DAY_LIMIT,
  WINDOW_SIZE_DAYS,
  DEFAULT_RISK_THRESHOLDS,
  DEFAULT_STATUS_THRESHOLDS,
  SCHENGEN_MEMBERSHIP,
  SCHENGEN_COUNTRY_CODES,
  EXCLUDED_COUNTRY_CODES,
  SCHENGEN_NAME_TO_CODE,
  EXCLUDED_NAME_TO_CODE,
} from './constants';

// ============================================================================
// Schengen Validation
// ============================================================================

export {
  isSchengenCountry,
  validateCountry,
  normalizeCountryCode,
  getSchengenCountryCodes,
  getSchengenCountries,
} from './schengen-validator';

export type { CountryValidationResult } from './schengen-validator';

// ============================================================================
// Presence Calculation
// ============================================================================

export {
  presenceDays,
  normalizeToUTCDate,
  dateKeysToArray,
  getPresenceBounds,
} from './presence-calculator';

// ============================================================================
// Window Calculation
// ============================================================================

export {
  isInWindow,
  daysUsedInWindow,
  calculateDaysRemaining,
  isCompliant,
  canSafelyEnter,
  getWindowBounds,
} from './window-calculator';

// ============================================================================
// Risk Calculation
// ============================================================================

export {
  getRiskLevel,
  getStatusFromDaysUsed,
  getRiskDescription,
  getRiskAction,
  getSeverityScore,
} from './risk-calculator';

// ============================================================================
// Safe Entry Calculation
// ============================================================================

export {
  earliestSafeEntry,
  daysUntilCompliant,
  getSafeEntryInfo,
  projectExpiringDays,
  maxStayDays,
} from './safe-entry';

// ============================================================================
// Compliance Vector (Calendar Optimization)
// ============================================================================

export {
  computeComplianceVector,
  computeComplianceVectorOptimized,
  computeMonthCompliance,
  computeYearCompliance,
} from './compliance-vector';

// ============================================================================
// Cached Calculations (Performance Optimization)
// ============================================================================

export {
  getCachedCompliance,
  batchCalculateCompliance,
  createComplianceCalculator,
  calculateComplianceRange,
  getComplianceAtDates,
} from './cached';

// ============================================================================
// High-Level Convenience Functions
// ============================================================================

import type { Trip, ComplianceConfig, ComplianceResult } from './types';
import { presenceDays } from './presence-calculator';
import { daysUsedInWindow, calculateDaysRemaining, isCompliant as checkCompliant } from './window-calculator';
import { getRiskLevel } from './risk-calculator';
import { SCHENGEN_DAY_LIMIT } from './constants';

/**
 * Calculates complete compliance status for an employee.
 *
 * This is a convenience function that combines all the individual
 * calculations into a single result object.
 *
 * @param trips - All trips for the employee
 * @param config - Compliance configuration
 * @returns Complete compliance result
 *
 * @example
 * const result = calculateCompliance(trips, {
 *   mode: 'audit',
 *   referenceDate: new Date(),
 * });
 *
 * console.log(result.daysRemaining); // 45
 * console.log(result.riskLevel);     // 'green'
 * console.log(result.isCompliant);   // true
 */
export function calculateCompliance(
  trips: readonly Trip[],
  config: ComplianceConfig
): ComplianceResult {
  const presence = presenceDays(trips, config);
  const daysUsed = daysUsedInWindow(presence, config.referenceDate, config);
  const limit = config.limit ?? SCHENGEN_DAY_LIMIT;
  const daysRemaining = limit - daysUsed;
  const riskLevel = getRiskLevel(daysRemaining, config.thresholds);
  // Compliant if 89 or fewer days used (90+ is violation per EU Regulation 610/2013)
  const isCompliantNow = daysUsed <= limit - 1;

  return {
    referenceDate: config.referenceDate,
    daysUsed,
    daysRemaining,
    riskLevel,
    isCompliant: isCompliantNow,
  };
}
