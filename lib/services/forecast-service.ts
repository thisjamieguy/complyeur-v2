/**
 * @fileoverview Forecast service for future job compliance calculations.
 *
 * Phase 10: Forecasting & Planning
 * Calculates whether future trips will be compliant with the 90/180-day rule.
 *
 * Key algorithms:
 * - calculateFutureJobCompliance: Core forecast calculation
 * - getRiskLevelForForecast: Risk level based on days used
 * - calculateCompliantFromDate: When a non-compliant trip becomes safe
 * - calculateWhatIfScenario: Hypothetical trip testing
 *
 * @version 2025-01-07
 */

import {
  isBefore,
  isAfter,
  isEqual,
  format,
} from 'date-fns';
import {
  isSchengenCountry,
  presenceDays,
  daysUsedInWindow,
  SCHENGEN_DAY_LIMIT,
  WINDOW_SIZE_DAYS,
  DEFAULT_COMPLIANCE_START_DATE,
  parseDateOnlyAsUTC,
  validateCountry,
} from '@/lib/compliance';
import { addUtcDays, differenceInUtcDays, toUTCMidnight } from '@/lib/compliance/date-utils';
import type { Trip as ComplianceTrip, ComplianceConfig } from '@/lib/compliance';
import type {
  ForecastTrip,
  ForecastResult,
  ForecastRiskLevel,
  WhatIfInput,
  WhatIfResult,
  ForecastConfig,
} from '@/types/forecast';

// ============================================================================
// Country Flag Utility
// ============================================================================

/**
 * Converts ISO 3166-1 alpha-2 country code to emoji flag.
 * Uses Regional Indicator Symbol pairs.
 */
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) {
    return '🏳️';
  }
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Gets country display name from code.
 */
export function getCountryName(countryCode: string): string {
  const validation = validateCountry(countryCode);
  return validation.countryName ?? countryCode;
}

// ============================================================================
// Risk Level Calculation
// ============================================================================

/**
 * Determines risk level based on days used after a trip.
 *
 * @param daysUsed - Total days that will be used after the trip
 * @param warningThreshold - Days at which to show yellow warning (default: 80)
 * @returns Risk level: 'green', 'yellow', or 'red'
 *
 * @example
 * getRiskLevelForForecast(45)  // 'green'
 * getRiskLevelForForecast(85)  // 'yellow'
 * getRiskLevelForForecast(95)  // 'red'
 */
export function getRiskLevelForForecast(
  daysUsed: number,
  warningThreshold: number = 80
): ForecastRiskLevel {
  if (daysUsed >= SCHENGEN_DAY_LIMIT) {
    return 'red';
  }
  if (daysUsed >= warningThreshold) {
    return 'yellow';
  }
  return 'green';
}

// ============================================================================
// Date Conversion Utilities
// ============================================================================

/**
 * Safely parses a date from string or Date object.
 * Date-only strings are parsed at UTC midnight for stable day math.
 */
function safeParseDate(date: string | Date): Date {
  if (date instanceof Date) {
    return date;
  }
  return parseDateOnlyAsUTC(date);
}

/**
 * Converts database trip format to compliance Trip format.
 */
function toComplianceTrip(trip: ForecastTrip): ComplianceTrip {
  return {
    id: trip.id,
    entryDate: safeParseDate(trip.entryDate),
    exitDate: safeParseDate(trip.exitDate),
    country: trip.country,
  };
}

/**
 * Calculates trip duration in days (both entry and exit dates count).
 */
export function calculateTripDuration(entryDate: Date, exitDate: Date): number {
  return differenceInUtcDays(exitDate, entryDate) + 1;
}

// ============================================================================
// Core Forecast Calculation
// ============================================================================

/**
 * Calculates compliance forecast for a future trip.
 *
 * Algorithm:
 * 1. Parse future trip dates and calculate duration
 * 2. Filter all trips to only those BEFORE the future trip starts
 * 3. Calculate presence days from those trips (Schengen only, not ghosted)
 * 4. Calculate days used in the 180-day window at trip start date
 * 5. If trip is to a Schengen country, add trip duration to get days after
 * 6. Determine risk level based on days after trip
 * 7. If not compliant, calculate when the trip would become compliant
 *
 * @param futureTrip - The future trip to forecast
 * @param allEmployeeTrips - All trips for this employee (past and future)
 * @param employeeName - Display name for the result
 * @param config - Forecast configuration (thresholds, limits)
 * @returns Complete forecast result
 */
export function calculateFutureJobCompliance(
  futureTrip: ForecastTrip,
  allEmployeeTrips: ForecastTrip[],
  employeeName: string,
  config: Partial<ForecastConfig> = {}
): ForecastResult {
  const warningThreshold = config.warningThreshold ?? 80;
  const limit = config.limit ?? SCHENGEN_DAY_LIMIT;

  // Parse trip dates
  const tripEntryDate = safeParseDate(futureTrip.entryDate);
  const tripExitDate = safeParseDate(futureTrip.exitDate);
  const tripDuration = calculateTripDuration(tripEntryDate, tripExitDate);

  // Check if trip is to a Schengen country
  const isSchengen = isSchengenCountry(futureTrip.country);

  // Filter trips to only those BEFORE this future trip starts
  // AND not ghosted (ghosted trips are excluded from calculations)
  const tripsBeforeJob = allEmployeeTrips.filter((trip) => {
    if (trip.ghosted) return false;
    if (trip.id === futureTrip.id) return false; // Don't include the trip itself
    const tripEntry = safeParseDate(trip.entryDate);
    return isBefore(tripEntry, tripEntryDate);
  });

  // Convert to compliance trips for the presence calculation
  const complianceTrips: ComplianceTrip[] = tripsBeforeJob.map(toComplianceTrip);

  // Calculate presence days using 'planning' mode to include all trips
  // We use the trip entry date as reference and look back 180 days
  const complianceConfig: ComplianceConfig = {
    mode: 'planning',
    referenceDate: tripEntryDate,
    complianceStartDate: DEFAULT_COMPLIANCE_START_DATE,
    limit,
  };

  const presence = presenceDays(complianceTrips, complianceConfig);

  // Calculate days used in the 180-day window BEFORE the trip starts
  // The window is [entryDate - 179, entryDate] (180 days inclusive)
  const daysUsedBeforeTrip = daysUsedInWindow(presence, tripEntryDate, complianceConfig);

  // Calculate days after the trip
  // If Schengen: add the trip duration
  // If non-Schengen: days remain the same (trip doesn't count)
  const daysAfterTrip = isSchengen
    ? daysUsedBeforeTrip + tripDuration
    : daysUsedBeforeTrip;

  // Calculate days remaining (can be negative if over limit)
  const daysRemainingAfterTrip = limit - daysAfterTrip;

  // Determine risk level
  const riskLevel = getRiskLevelForForecast(daysAfterTrip, warningThreshold);

  // Determine compliance
  const isCompliant = daysAfterTrip < limit;

  // Calculate compliant-from date if not compliant
  let compliantFromDate: Date | null = null;
  if (!isCompliant && isSchengen) {
    compliantFromDate = calculateCompliantFromDate(
      allEmployeeTrips,
      futureTrip,
      limit
    );
  }

  // Get country info
  const countryName = getCountryName(futureTrip.country);
  const countryFlag = getCountryFlag(futureTrip.country);

  return {
    tripId: futureTrip.id,
    employeeId: futureTrip.employeeId,
    employeeName,
    country: futureTrip.country,
    countryName,
    countryFlag,
    entryDate: tripEntryDate,
    exitDate: tripExitDate,
    tripDuration,
    isSchengen,
    daysUsedBeforeTrip,
    daysAfterTrip,
    daysRemainingAfterTrip,
    riskLevel,
    isCompliant,
    compliantFromDate,
    tripsInWindow: tripsBeforeJob,
  };
}

// ============================================================================
// Compliant-From Date Calculation
// ============================================================================

/**
 * Calculates the earliest date when a non-compliant trip would become compliant.
 *
 * Algorithm:
 * Starting from the trip's entry date, check each subsequent day:
 * 1. Calculate days used in the 180-day window for that check date
 * 2. Add the trip duration
 * 3. If total < limit, return that date
 * 4. Continue for up to 180 days
 *
 * @param allTrips - All trips for the employee
 * @param futureTrip - The trip to check
 * @param limit - Maximum days allowed (default: 90)
 * @returns Date when trip becomes compliant, or max check date if still not compliant
 */
export function calculateCompliantFromDate(
  allTrips: ForecastTrip[],
  futureTrip: ForecastTrip,
  limit: number = SCHENGEN_DAY_LIMIT
): Date | null {
  const tripEntryDate = safeParseDate(futureTrip.entryDate);
  const tripExitDate = safeParseDate(futureTrip.exitDate);
  const tripDuration = calculateTripDuration(tripEntryDate, tripExitDate);

  // If not a Schengen trip, it's always compliant (doesn't count toward limit)
  if (!isSchengenCountry(futureTrip.country)) {
    return null;
  }

  // Filter trips: not ghosted, not the future trip itself, only Schengen
  const relevantTrips = allTrips.filter((trip) => {
    if (trip.ghosted) return false;
    if (trip.id === futureTrip.id) return false;
    return isSchengenCountry(trip.country);
  });

  // Convert and sort once so we can incrementally add eligible trips per check date.
  // This avoids filtering the full list on every single day in the loop below.
  const complianceTrips: ComplianceTrip[] = relevantTrips
    .map(toComplianceTrip)
    .sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime());

  // Check each day for up to 180 days
  const maxCheckDays = WINDOW_SIZE_DAYS;
  let checkDate = tripEntryDate;
  const complianceConfigBase: Omit<ComplianceConfig, 'referenceDate'> = {
    mode: 'planning',
    complianceStartDate: DEFAULT_COMPLIANCE_START_DATE,
    limit,
  };

  const tripsBeforeCheck: ComplianceTrip[] = [];
  let nextTripIndex = 0;

  for (let i = 0; i <= maxCheckDays; i++) {
    checkDate = addUtcDays(tripEntryDate, i);

    // Include newly eligible trips for this check date.
    while (
      nextTripIndex < complianceTrips.length &&
      isBefore(complianceTrips[nextTripIndex].entryDate, checkDate)
    ) {
      tripsBeforeCheck.push(complianceTrips[nextTripIndex]);
      nextTripIndex++;
    }

    const complianceConfig: ComplianceConfig = {
      ...complianceConfigBase,
      referenceDate: checkDate,
    };

    const presence = presenceDays(tripsBeforeCheck, complianceConfig);
    const daysUsedBefore = daysUsedInWindow(presence, checkDate, complianceConfig);

    // Check if trip would be compliant starting on this date
    const daysAfterTrip = daysUsedBefore + tripDuration;

    if (daysAfterTrip < limit) {
      return checkDate;
    }
  }

  // Return the max check date if still not compliant
  return addUtcDays(tripEntryDate, maxCheckDays);
}

// ============================================================================
// What-If Scenario Calculation
// ============================================================================

/**
 * Calculates compliance for a hypothetical (not yet scheduled) trip.
 *
 * Creates a temporary trip object and runs the same forecast calculation.
 * The trip is NOT saved to the database.
 *
 * @param input - What-if scenario input (employee, dates, country)
 * @param allEmployeeTrips - All existing trips for the employee
 * @param employeeName - Employee display name
 * @param config - Forecast configuration
 * @returns What-if result with scenario metadata
 */
export function calculateWhatIfScenario(
  input: WhatIfInput,
  allEmployeeTrips: ForecastTrip[],
  employeeName: string,
  config: Partial<ForecastConfig> = {}
): WhatIfResult {
  // Create a temporary trip object
  const scenarioTrip: ForecastTrip = {
    id: `scenario-${Date.now()}`,
    employeeId: input.employeeId,
    companyId: '', // Not needed for calculation
    country: input.scenarioCountry.toUpperCase(),
    entryDate: format(input.scenarioStart, 'yyyy-MM-dd'),
    exitDate: format(input.scenarioEnd, 'yyyy-MM-dd'),
    purpose: null,
    jobRef: null,
    isPrivate: false,
    ghosted: false,
    travelDays: calculateTripDuration(input.scenarioStart, input.scenarioEnd),
  };

  // Run the standard forecast calculation
  const forecastResult = calculateFutureJobCompliance(
    scenarioTrip,
    allEmployeeTrips,
    employeeName,
    config
  );

  // Return as WhatIfResult with scenario metadata
  return {
    ...forecastResult,
    isScenario: true,
    scenarioId: scenarioTrip.id,
  };
}

// ============================================================================
// Batch Forecast Calculation
// ============================================================================

/**
 * Calculates forecasts for all future trips for an employee.
 *
 * @param employeeId - Employee UUID
 * @param employeeName - Employee display name
 * @param allTrips - All trips for the employee
 * @param config - Forecast configuration
 * @returns Array of forecast results for future trips
 */
export function calculateAllFutureForecasts(
  employeeId: string,
  employeeName: string,
  allTrips: ForecastTrip[],
  config: Partial<ForecastConfig> = {}
): ForecastResult[] {
  const today = toUTCMidnight(new Date());

  // Filter to future trips only (entry date > today)
  const futureTrips = allTrips.filter((trip) => {
    if (trip.ghosted) return false;
    const entryDate = safeParseDate(trip.entryDate);
    return isAfter(entryDate, today) || isEqual(entryDate, today);
  });

  // Calculate forecast for each future trip
  return futureTrips.map((trip) =>
    calculateFutureJobCompliance(trip, allTrips, employeeName, config)
  );
}

// ============================================================================
// Sorting and Filtering Utilities
// ============================================================================

/**
 * Risk level priority for sorting (lower = more urgent).
 */
const RISK_PRIORITY: Record<ForecastRiskLevel, number> = {
  red: 0,
  yellow: 1,
  green: 2,
};

/**
 * Sorts forecast results by the specified field and order.
 */
export function sortForecasts(
  forecasts: ForecastResult[],
  field: 'date' | 'employee' | 'risk',
  order: 'asc' | 'desc'
): ForecastResult[] {
  const sorted = [...forecasts];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case 'date':
        comparison = a.entryDate.getTime() - b.entryDate.getTime();
        break;
      case 'employee':
        comparison = a.employeeName.localeCompare(b.employeeName);
        break;
      case 'risk':
        comparison = RISK_PRIORITY[a.riskLevel] - RISK_PRIORITY[b.riskLevel];
        break;
    }

    return order === 'desc' ? -comparison : comparison;
  });

  return sorted;
}

/**
 * Filters forecast results by risk level.
 */
export function filterForecastsByRisk(
  forecasts: ForecastResult[],
  filter: 'all' | 'at-risk' | 'critical'
): ForecastResult[] {
  switch (filter) {
    case 'all':
      return forecasts;
    case 'at-risk':
      return forecasts.filter((f) => f.riskLevel !== 'green');
    case 'critical':
      return forecasts.filter((f) => f.riskLevel === 'red');
  }
}

// ============================================================================
// Display Utilities
// ============================================================================

/**
 * Formats days remaining for display.
 */
export function formatDaysRemaining(days: number): string {
  if (days >= 0) {
    return `${days} days remaining`;
  }
  return `${Math.abs(days)} days over limit`;
}

/**
 * Formats a date for display in the table.
 */
export function formatDisplayDate(date: Date): string {
  return format(date, 'd MMM yyyy');
}

/**
 * Formats a date range for display.
 */
export function formatDateRange(start: Date, end: Date): string {
  return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
}
