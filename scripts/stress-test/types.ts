/**
 * @fileoverview Type definitions for stress test suite.
 */

/**
 * Trip record for stress test generation and insertion.
 */
export interface StressTestTrip {
  employee_email: string;
  employee_name: string;
  entry_date: string; // YYYY-MM-DD
  exit_date: string; // YYYY-MM-DD
  country: string; // 2-letter ISO code
  raw_days: number; // Pre-calculated: differenceInDays + 1
}

/**
 * Employee record for stress test.
 */
export interface StressTestEmployee {
  id?: string;
  email: string;
  name: string;
}

/**
 * Configuration for test data generation.
 */
export interface GeneratorConfig {
  seed: number;
  targetTotalDays: number;
  employeeCount: number;
  schengenRatio: number; // 0.7 = 70% Schengen trips
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  minTripDays: number;
  maxTripDays: number;
  overlapProbability: number; // Chance of overlapping with another trip
}

/**
 * Expected values calculated by the oracle.
 */
export interface ExpectedValues {
  totalTrips: number;
  totalRawDays: number;
  schengenRawDays: number;
  nonSchengenRawDays: number;
  uniqueSchengenDays: number; // After deduplication
  uniqueNonSchengenDays: number;
  perEmployee: Map<string, EmployeeExpectedValues>;
  perCountry: Map<string, CountryStats>;
  edgeCases: EdgeCaseStats;
}

/**
 * Expected values for a single employee.
 */
export interface EmployeeExpectedValues {
  email: string;
  name: string;
  totalTrips: number;
  totalRawDays: number;
  schengenRawDays: number;
  nonSchengenRawDays: number;
  uniqueSchengenDays: number;
  uniqueNonSchengenDays: number;
}

/**
 * Statistics per country.
 */
export interface CountryStats {
  code: string;
  isSchengen: boolean;
  trips: number;
  rawDays: number;
}

/**
 * Edge case statistics.
 */
export interface EdgeCaseStats {
  sameDayTrips: number;
  yearSpanningTrips: number;
  leapYearTrips: number;
  overlappingTripPairs: number;
}

/**
 * Actual values fetched from the application.
 */
export interface ActualValues {
  totalTrips: number;
  totalRawDays: number;
  schengenRawDays: number;
  nonSchengenRawDays: number;
  uniqueSchengenDays: number;
  uniqueNonSchengenDays: number;
  perEmployee: Map<string, EmployeeActualValues>;
  perCountry: Map<string, CountryStats>;
}

/**
 * Actual values for a single employee.
 */
export interface EmployeeActualValues {
  email: string;
  name: string;
  employeeId: string;
  totalTrips: number;
  totalRawDays: number;
  uniqueSchengenDays: number;
}

/**
 * Comparison result for a single metric.
 */
export interface MetricComparison {
  name: string;
  expected: number;
  actual: number;
  passed: boolean;
  difference: number;
}

/**
 * Discrepancy found during validation.
 */
export interface Discrepancy {
  type: 'count' | 'days' | 'compliance' | 'deduplication';
  entity: string; // e.g., "employee:test@test.com" or "country:FR"
  metric: string;
  expected: number;
  actual: number;
  difference: number;
}

/**
 * Full validation report.
 */
export interface ValidationReport {
  testName: string;
  timestamp: string;
  config: GeneratorConfig;

  // Data volume
  tripsGenerated: number;
  tripsInserted: number;
  importSuccessRate: number;

  // Metrics
  metrics: MetricComparison[];

  // Discrepancies
  discrepancies: Discrepancy[];

  // Overall status
  passed: boolean;

  // Performance
  generationDurationMs: number;
  insertionDurationMs: number;
  calculationDurationMs: number;
  totalDurationMs: number;
}

/**
 * Generator output containing trips and expected values.
 */
export interface GeneratorOutput {
  trips: StressTestTrip[];
  employees: StressTestEmployee[];
  expected: ExpectedValues;
  metadata: {
    seed: number;
    generatedAt: string;
    totalTrips: number;
    totalDays: number;
    countriesUsed: number;
  };
}
