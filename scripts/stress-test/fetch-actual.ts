/**
 * @fileoverview Fetches actual values from the database for comparison.
 *
 * Queries the database and runs compliance calculations
 * to get actual values for validation.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { addDays, parseISO } from 'date-fns';
import { SCHENGEN_SET } from './constants';
import { formatDate, formatNumber } from './utils';
import type { ActualValues, EmployeeActualValues, CountryStats } from './types';

/**
 * Creates a Supabase admin client for database access.
 */
function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Database trip record.
 */
interface DbTrip {
  id: string;
  employee_id: string;
  entry_date: string;
  exit_date: string;
  country: string;
  travel_days: number | null;
}

/**
 * Database employee record.
 */
interface DbEmployee {
  id: string;
  name: string;
  email: string | null;
}

/**
 * Fetches all trips for a company from the database.
 *
 * @param supabase - Supabase client
 * @param companyId - Company ID
 * @returns Array of trips
 */
async function fetchTrips(
  supabase: SupabaseClient,
  companyId: string
): Promise<DbTrip[]> {
  const allTrips: DbTrip[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('trips')
      .select('id, employee_id, entry_date, exit_date, country, travel_days')
      .eq('company_id', companyId)
      .is('ghosted', false)
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Failed to fetch trips: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    allTrips.push(...data);
    offset += pageSize;

    if (data.length < pageSize) {
      break;
    }
  }

  return allTrips;
}

/**
 * Fetches all employees for a company from the database.
 *
 * @param supabase - Supabase client
 * @param companyId - Company ID
 * @returns Map of employee ID -> employee data
 */
async function fetchEmployees(
  supabase: SupabaseClient,
  companyId: string
): Promise<Map<string, DbEmployee>> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, email')
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Failed to fetch employees: ${error.message}`);
  }

  const map = new Map<string, DbEmployee>();
  if (data) {
    data.forEach(emp => map.set(emp.id, emp));
  }
  return map;
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
 * Calculates actual values from database data.
 * Mirrors the app's calculation logic.
 *
 * @param trips - Trips from database
 * @param employees - Employees from database
 * @returns Actual values
 */
function calculateActualValues(
  trips: DbTrip[],
  employees: Map<string, DbEmployee>
): ActualValues {
  // Track per-employee data
  const perEmployee = new Map<string, EmployeeActualValues>();
  const perCountry = new Map<string, CountryStats>();

  // Per-employee day sets for deduplication (same logic as app)
  const employeeSchengenDays = new Map<string, Set<string>>();

  // Initialize employee tracking
  for (const [id, emp] of employees) {
    perEmployee.set(id, {
      email: emp.email || '',
      name: emp.name,
      employeeId: id,
      totalTrips: 0,
      totalRawDays: 0,
      uniqueSchengenDays: 0,
    });
    employeeSchengenDays.set(id, new Set());
  }

  // Global tracking
  const globalSchengenDays = new Set<string>();
  const globalNonSchengenDays = new Set<string>();
  let totalRawDays = 0;
  let schengenRawDays = 0;
  let nonSchengenRawDays = 0;

  // Process each trip
  for (const trip of trips) {
    const isSchengen = SCHENGEN_SET.has(trip.country);

    // Calculate raw days (travel_days from DB or calculate)
    const rawDays = trip.travel_days ?? calculateTripDays(trip.entry_date, trip.exit_date);

    // Update global totals
    totalRawDays += rawDays;
    if (isSchengen) {
      schengenRawDays += rawDays;
    } else {
      nonSchengenRawDays += rawDays;
    }

    // Update per-employee
    const empData = perEmployee.get(trip.employee_id);
    if (empData) {
      empData.totalTrips++;
      empData.totalRawDays += rawDays;
    }

    // Update per-country
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
    const empSchengenSet = employeeSchengenDays.get(trip.employee_id);

    for (const day of days) {
      if (isSchengen) {
        globalSchengenDays.add(day);
        empSchengenSet?.add(day);
      } else {
        globalNonSchengenDays.add(day);
      }
    }
  }

  // Calculate unique days per employee
  for (const [empId, empData] of perEmployee) {
    const schengenSet = employeeSchengenDays.get(empId);
    empData.uniqueSchengenDays = schengenSet?.size || 0;
  }

  return {
    totalTrips: trips.length,
    totalRawDays,
    schengenRawDays,
    nonSchengenRawDays,
    uniqueSchengenDays: globalSchengenDays.size,
    uniqueNonSchengenDays: globalNonSchengenDays.size,
    perEmployee,
    perCountry,
  };
}

/**
 * Helper to calculate trip days from dates.
 */
function calculateTripDays(entryDate: string, exitDate: string): number {
  const entry = parseISO(entryDate);
  const exit = parseISO(exitDate);
  const diffTime = exit.getTime() - entry.getTime();
  return Math.floor(diffTime / (24 * 60 * 60 * 1000)) + 1;
}

/**
 * Fetches actual values from the database for a company.
 *
 * @param companyId - Company ID to fetch data for
 * @returns Actual values calculated from database data
 */
export async function fetchActualValues(companyId: string): Promise<ActualValues> {
  console.log('\n========================================');
  console.log('FETCHING ACTUAL VALUES FROM DATABASE');
  console.log('========================================');

  const startTime = Date.now();
  const supabase = createAdminClient();

  // Fetch data
  console.log(`\nFetching data for company: ${companyId}`);

  const [trips, employees] = await Promise.all([
    fetchTrips(supabase, companyId),
    fetchEmployees(supabase, companyId),
  ]);

  console.log(`  Trips fetched: ${formatNumber(trips.length)}`);
  console.log(`  Employees fetched: ${formatNumber(employees.size)}`);

  // Calculate actual values using same logic as the app
  console.log(`\nCalculating actual values...`);
  const actual = calculateActualValues(trips, employees);

  const durationMs = Date.now() - startTime;
  console.log(`\nActual values calculated in ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`  Total trips: ${formatNumber(actual.totalTrips)}`);
  console.log(`  Total raw days: ${formatNumber(actual.totalRawDays)}`);
  console.log(`  Unique Schengen days: ${formatNumber(actual.uniqueSchengenDays)}`);
  console.log(`  Unique non-Schengen days: ${formatNumber(actual.uniqueNonSchengenDays)}`);

  return actual;
}
