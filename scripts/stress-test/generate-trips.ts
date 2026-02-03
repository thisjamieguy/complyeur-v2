/**
 * @fileoverview Trip data generator for stress testing.
 *
 * Generates predictable test data with known expected values.
 * Uses seeded random for reproducibility.
 */

import { addDays, parseISO } from 'date-fns';
import {
  SCHENGEN_COUNTRIES,
  NON_SCHENGEN_COUNTRIES,
  SCHENGEN_SET,
  DEFAULT_CONFIG,
  TEST_EMAIL_DOMAIN,
} from './constants';
import {
  createSeededRandom,
  randomInt,
  randomPick,
  formatDate,
  calculateTripDays,
  isYearSpanning,
  includesLeapDay,
} from './utils';
import type {
  GeneratorConfig,
  GeneratorOutput,
  StressTestTrip,
  StressTestEmployee,
  ExpectedValues,
  EmployeeExpectedValues,
  CountryStats,
  EdgeCaseStats,
} from './types';

/**
 * Generates test employees with predictable email patterns.
 *
 * @param count - Number of employees to generate
 * @returns Array of test employees
 */
export function generateTestEmployees(count: number): StressTestEmployee[] {
  return Array.from({ length: count }, (_, i) => ({
    email: `employee-${String(i + 1).padStart(5, '0')}@${TEST_EMAIL_DOMAIN}`,
    name: `Test Employee ${i + 1}`,
  }));
}

/**
 * Generates stress test data with known expected values.
 *
 * @param config - Generator configuration
 * @returns Generated trips, employees, and expected values
 */
export function generateStressTestData(
  config: Partial<GeneratorConfig> = {}
): GeneratorOutput {
  const fullConfig: GeneratorConfig = { ...DEFAULT_CONFIG, ...config };
  const {
    seed,
    targetTotalDays,
    employeeCount,
    schengenRatio,
    startDate,
    endDate,
    minTripDays,
    maxTripDays,
  } = fullConfig;

  console.log(`\nGenerating stress test data...`);
  console.log(`  Seed: ${seed}`);
  console.log(`  Target days: ${targetTotalDays.toLocaleString()}`);
  console.log(`  Employees: ${employeeCount}`);
  console.log(`  Schengen ratio: ${(schengenRatio * 100).toFixed(0)}%`);

  const random = createSeededRandom(seed);
  const employees = generateTestEmployees(employeeCount);
  const trips: StressTestTrip[] = [];

  // Track days generated
  let totalDaysGenerated = 0;

  // Track per-employee trips for overlap detection
  const employeeTrips = new Map<string, StressTestTrip[]>();
  employees.forEach(emp => employeeTrips.set(emp.email, []));

  // Generate trips until we reach target
  while (totalDaysGenerated < targetTotalDays) {
    // Pick random employee
    const employee = randomPick(random, employees);

    // Decide Schengen vs non-Schengen
    const isSchengen = random() < schengenRatio;
    const countryList = isSchengen ? SCHENGEN_COUNTRIES : NON_SCHENGEN_COUNTRIES;
    const country = randomPick(random, countryList);

    // Generate trip duration
    const tripDays = randomInt(random, minTripDays, maxTripDays);

    // Generate entry date within range, leaving room for trip duration
    const rangeStart = parseISO(startDate);
    const rangeEnd = addDays(parseISO(endDate), -tripDays);
    const daysInRange = Math.max(1, Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000)));
    const randomDays = randomInt(random, 0, daysInRange);
    const entryDate = addDays(rangeStart, randomDays);
    const exitDate = addDays(entryDate, tripDays - 1);

    const trip: StressTestTrip = {
      employee_email: employee.email,
      employee_name: employee.name,
      entry_date: formatDate(entryDate),
      exit_date: formatDate(exitDate),
      country,
      raw_days: tripDays,
    };

    trips.push(trip);
    employeeTrips.get(employee.email)!.push(trip);
    totalDaysGenerated += tripDays;

    // Progress logging every 10000 days
    if (totalDaysGenerated % 50000 === 0) {
      console.log(`  Generated ${totalDaysGenerated.toLocaleString()} days (${trips.length.toLocaleString()} trips)...`);
    }
  }

  console.log(`  Final: ${totalDaysGenerated.toLocaleString()} days in ${trips.length.toLocaleString()} trips`);

  // Calculate expected values
  const expected = calculateExpectedValues(trips, employees);

  // Collect metadata
  const countriesUsed = new Set(trips.map(t => t.country));

  return {
    trips,
    employees,
    expected,
    metadata: {
      seed,
      generatedAt: new Date().toISOString(),
      totalTrips: trips.length,
      totalDays: totalDaysGenerated,
      countriesUsed: countriesUsed.size,
    },
  };
}

/**
 * Calculates expected values from generated trips.
 * This acts as the "oracle" - the source of truth for validation.
 *
 * @param trips - Generated trips
 * @param employees - Generated employees
 * @returns Expected values
 */
function calculateExpectedValues(
  trips: StressTestTrip[],
  employees: StressTestEmployee[]
): ExpectedValues {
  console.log(`\nCalculating expected values...`);

  // Initialize tracking
  const perEmployee = new Map<string, EmployeeExpectedValues>();
  const perCountry = new Map<string, CountryStats>();
  const edgeCases: EdgeCaseStats = {
    sameDayTrips: 0,
    yearSpanningTrips: 0,
    leapYearTrips: 0,
    overlappingTripPairs: 0,
  };

  // Initialize per-employee tracking
  employees.forEach(emp => {
    perEmployee.set(emp.email, {
      email: emp.email,
      name: emp.name,
      totalTrips: 0,
      totalRawDays: 0,
      schengenRawDays: 0,
      nonSchengenRawDays: 0,
      uniqueSchengenDays: 0,
      uniqueNonSchengenDays: 0,
    });
  });

  // Sets for unique day tracking (global)
  const globalSchengenDays = new Set<string>();
  const globalNonSchengenDays = new Set<string>();

  // Per-employee day sets for deduplication
  const employeeSchengenDays = new Map<string, Set<string>>();
  const employeeNonSchengenDays = new Map<string, Set<string>>();
  employees.forEach(emp => {
    employeeSchengenDays.set(emp.email, new Set());
    employeeNonSchengenDays.set(emp.email, new Set());
  });

  // Per-employee trip lists for overlap detection
  const employeeTrips = new Map<string, StressTestTrip[]>();
  employees.forEach(emp => employeeTrips.set(emp.email, []));

  // Process each trip
  let totalRawDays = 0;
  let schengenRawDays = 0;
  let nonSchengenRawDays = 0;

  for (const trip of trips) {
    const isSchengen = SCHENGEN_SET.has(trip.country);
    const empData = perEmployee.get(trip.employee_email)!;
    const rawDays = trip.raw_days;

    // Update raw totals
    totalRawDays += rawDays;
    empData.totalTrips++;
    empData.totalRawDays += rawDays;

    if (isSchengen) {
      schengenRawDays += rawDays;
      empData.schengenRawDays += rawDays;
    } else {
      nonSchengenRawDays += rawDays;
      empData.nonSchengenRawDays += rawDays;
    }

    // Update per-country stats
    if (!perCountry.has(trip.country)) {
      perCountry.set(trip.country, {
        code: trip.country,
        isSchengen,
        trips: 0,
        rawDays: 0,
      });
    }
    const countryData = perCountry.get(trip.country)!;
    countryData.trips++;
    countryData.rawDays += rawDays;

    // Generate all days for deduplication
    const days = generateTripDays(trip.entry_date, trip.exit_date);
    const empSchengenSet = employeeSchengenDays.get(trip.employee_email)!;
    const empNonSchengenSet = employeeNonSchengenDays.get(trip.employee_email)!;

    for (const day of days) {
      if (isSchengen) {
        globalSchengenDays.add(day);
        empSchengenSet.add(day);
      } else {
        globalNonSchengenDays.add(day);
        empNonSchengenSet.add(day);
      }
    }

    // Track edge cases
    if (trip.entry_date === trip.exit_date) {
      edgeCases.sameDayTrips++;
    }
    if (isYearSpanning(trip.entry_date, trip.exit_date)) {
      edgeCases.yearSpanningTrips++;
    }
    if (includesLeapDay(trip.entry_date, trip.exit_date)) {
      edgeCases.leapYearTrips++;
    }

    // Check for overlaps with other trips by same employee
    const empTripList = employeeTrips.get(trip.employee_email)!;
    for (const existingTrip of empTripList) {
      if (tripsOverlap(trip, existingTrip)) {
        edgeCases.overlappingTripPairs++;
      }
    }
    empTripList.push(trip);
  }

  // Calculate unique days per employee
  for (const emp of employees) {
    const empData = perEmployee.get(emp.email)!;
    empData.uniqueSchengenDays = employeeSchengenDays.get(emp.email)!.size;
    empData.uniqueNonSchengenDays = employeeNonSchengenDays.get(emp.email)!.size;
  }

  console.log(`  Total trips: ${trips.length.toLocaleString()}`);
  console.log(`  Total raw days: ${totalRawDays.toLocaleString()}`);
  console.log(`  Unique Schengen days (global): ${globalSchengenDays.size.toLocaleString()}`);
  console.log(`  Unique non-Schengen days (global): ${globalNonSchengenDays.size.toLocaleString()}`);
  console.log(`  Edge cases: ${edgeCases.sameDayTrips} same-day, ${edgeCases.yearSpanningTrips} year-spanning, ${edgeCases.overlappingTripPairs} overlapping pairs`);

  return {
    totalTrips: trips.length,
    totalRawDays,
    schengenRawDays,
    nonSchengenRawDays,
    uniqueSchengenDays: globalSchengenDays.size,
    uniqueNonSchengenDays: globalNonSchengenDays.size,
    perEmployee,
    perCountry,
    edgeCases,
  };
}

/**
 * Generates all dates for a trip (inclusive).
 */
function generateTripDays(entryDate: string, exitDate: string): string[] {
  const days: string[] = [];
  let current = parseISO(entryDate);
  const end = parseISO(exitDate);

  while (current <= end) {
    days.push(formatDate(current));
    current = addDays(current, 1);
  }

  return days;
}

/**
 * Checks if two trips overlap.
 */
function tripsOverlap(
  trip1: StressTestTrip,
  trip2: StressTestTrip
): boolean {
  const start1 = parseISO(trip1.entry_date);
  const end1 = parseISO(trip1.exit_date);
  const start2 = parseISO(trip2.entry_date);
  const end2 = parseISO(trip2.exit_date);

  return start1 <= end2 && start2 <= end1;
}
