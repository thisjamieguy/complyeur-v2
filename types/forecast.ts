/**
 * @fileoverview Type definitions for the Forecasting & Planning module.
 *
 * Phase 10: Forecasting & Planning
 * These types support future job compliance calculations, what-if scenarios,
 * and the future job alerts page.
 *
 * @version 2025-01-07
 */

// ============================================================================
// Core Forecast Types
// ============================================================================

/**
 * Trip data structure for forecast calculations.
 * Matches the database schema with additional computed fields.
 */
export interface ForecastTrip {
  /** Trip UUID */
  id: string;
  /** Employee UUID */
  employeeId: string;
  /** Company UUID */
  companyId: string;
  /** ISO 3166-1 alpha-2 country code */
  country: string;
  /** Entry date (ISO string, e.g., '2025-10-12') */
  entryDate: string;
  /** Exit date (ISO string, e.g., '2025-10-20') */
  exitDate: string;
  /** Optional trip purpose/description */
  purpose?: string | null;
  /** Optional job reference number */
  jobRef?: string | null;
  /** Whether this is a private trip */
  isPrivate: boolean;
  /** If true, exclude from compliance calculations */
  ghosted: boolean;
  /** Computed trip duration in days (exit - entry + 1) */
  travelDays: number;
}

/**
 * Result of a future trip compliance forecast.
 * Contains all data needed to display a row in the future alerts table.
 */
export interface ForecastResult {
  /** The trip being forecasted */
  tripId: string;
  /** Employee UUID */
  employeeId: string;
  /** Employee display name */
  employeeName: string;
  /** ISO 3166-1 alpha-2 country code */
  country: string;
  /** Country display name */
  countryName: string;
  /** Emoji flag for the country (e.g., '🇫🇷') */
  countryFlag: string;
  /** Trip entry date */
  entryDate: Date;
  /** Trip exit date */
  exitDate: Date;
  /** Trip duration in days (exit - entry + 1) */
  tripDuration: number;
  /** Whether this trip is to a Schengen country */
  isSchengen: boolean;
  /** Days used in the 180-day window BEFORE this trip starts */
  daysUsedBeforeTrip: number;
  /** Days that will be used AFTER this trip completes */
  daysAfterTrip: number;
  /** Days remaining after trip (90 - daysAfterTrip). Can be negative. */
  daysRemainingAfterTrip: number;
  /** Risk level based on daysAfterTrip */
  riskLevel: ForecastRiskLevel;
  /** Whether the trip is compliant (daysAfterTrip < 90; 90 is a breach) */
  isCompliant: boolean;
  /** If not compliant, earliest date when trip would become compliant */
  compliantFromDate: Date | null;
  /** Trips that fall within the calculation window */
  tripsInWindow: ForecastTrip[];
}

/**
 * Risk level specific to forecasting.
 * Uses same values as compliance RiskLevel but with forecast-specific semantics:
 * - green: Trip is safe, plenty of margin
 * - yellow: Trip is risky, approaching the limit
 * - red: Trip would exceed the 90-day limit
 */
export type ForecastRiskLevel = 'green' | 'yellow' | 'red';

// ============================================================================
// What-If Scenario Types
// ============================================================================

/**
 * Input for a what-if scenario calculation.
 * Represents a hypothetical trip that hasn't been scheduled yet.
 */
export interface WhatIfInput {
  /** Employee UUID to calculate for */
  employeeId: string;
  /** Hypothetical trip start date */
  scenarioStart: Date;
  /** Hypothetical trip end date */
  scenarioEnd: Date;
  /** Country code for the hypothetical trip */
  scenarioCountry: string;
}

/**
 * Result of a what-if scenario calculation.
 * Extends ForecastResult with scenario-specific metadata.
 */
export interface WhatIfResult extends Omit<ForecastResult, 'tripId'> {
  /** Indicates this is a hypothetical scenario, not a real trip */
  isScenario: true;
  /** Unique identifier for this scenario calculation */
  scenarioId: string;
}

// ============================================================================
// Sorting and Filtering Types
// ============================================================================

/**
 * Fields available for sorting the future alerts table.
 */
export type ForecastSortField = 'date' | 'employee' | 'risk';

/**
 * Sort direction.
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Complete sort configuration.
 */
export interface ForecastSortConfig {
  /** Field to sort by */
  field: ForecastSortField;
  /** Sort direction */
  order: SortOrder;
}

/**
 * Filter options for the future alerts table.
 * - all: Show all future trips
 * - at-risk: Show yellow + red trips only
 * - critical: Show red trips only
 */
export type ForecastRiskFilter = 'all' | 'at-risk' | 'critical';

/**
 * Risk level priority for sorting (lower = more urgent).
 */
export const RISK_SORT_PRIORITY: Record<ForecastRiskLevel, number> = {
  red: 0,
  yellow: 1,
  green: 2,
} as const;

// ============================================================================
// Page State Types
// ============================================================================

/**
 * State for the future job alerts page.
 */
export interface FutureAlertsPageState {
  /** Current sort configuration */
  sort: ForecastSortConfig;
  /** Current risk filter */
  filter: ForecastRiskFilter;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
}

/**
 * State for the what-if calculator form.
 */
export interface WhatIfFormState {
  /** Selected employee ID */
  employeeId: string;
  /** Scenario start date (ISO string for form binding) */
  startDate: string;
  /** Scenario end date (ISO string for form binding) */
  endDate: string;
  /** Selected country code */
  country: string;
  /** Whether calculation is in progress */
  isCalculating: boolean;
  /** Error message if validation failed */
  error: string | null;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response from the forecast API for future trips.
 */
export interface FutureAlertsResponse {
  /** List of forecast results for future trips */
  forecasts: ForecastResult[];
  /** Total count of future trips */
  total: number;
  /** Number of at-risk trips (yellow + red) */
  atRiskCount: number;
  /** Number of critical trips (red only) */
  criticalCount: number;
}

/**
 * Response from the what-if calculation.
 */
export interface WhatIfResponse {
  /** The calculated result */
  result: WhatIfResult;
  /** Whether the calculation succeeded */
  success: boolean;
  /** Error message if calculation failed */
  error?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Configuration for forecast calculations.
 */
export interface ForecastConfig {
  /** Warning threshold for yellow status (default: 80) */
  warningThreshold: number;
  /** Maximum days allowed (default: 90) */
  limit: number;
  /** Risk thresholds for status badges */
  riskThresholds: {
    /** Days remaining for green status (default: 30) */
    green: number;
    /** Days remaining for amber status (default: 10) */
    amber: number;
  };
}

/**
 * Default forecast configuration values.
 */
export const DEFAULT_FORECAST_CONFIG: ForecastConfig = {
  warningThreshold: 80,
  limit: 90,
  riskThresholds: {
    green: 30,
    amber: 10,
  },
} as const;

/**
 * Employee data needed for forecast display.
 */
export interface ForecastEmployee {
  /** Employee UUID */
  id: string;
  /** Employee name */
  name: string;
}

/**
 * Country data with Schengen status.
 */
export interface ForecastCountry {
  /** ISO 3166-1 alpha-2 code */
  code: string;
  /** Country display name */
  name: string;
  /** Whether the country is in the Schengen Area */
  isSchengen: boolean;
  /** Emoji flag */
  flag: string;
}
