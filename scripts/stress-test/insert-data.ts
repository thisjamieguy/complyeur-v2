/**
 * @fileoverview Database insertion for stress test data.
 *
 * Inserts test employees and trips directly into Supabase,
 * bypassing the import UI limits.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { chunkArray, formatNumber, createProgressLogger } from './utils';
import type { StressTestTrip, StressTestEmployee } from './types';

// Batch size for database operations
const EMPLOYEE_BATCH_SIZE = 100;
const TRIP_BATCH_SIZE = 500;

/**
 * Creates a Supabase admin client for direct database access.
 */
function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!supabaseServiceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
      'This is required for stress test database operations.'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Result of data insertion operation.
 */
export interface InsertionResult {
  companyId: string;
  employeesCreated: number;
  employeesFailed: number;
  tripsCreated: number;
  tripsFailed: number;
  durationMs: number;
  employeeIdMap: Map<string, string>; // email -> id
}

/**
 * Creates or gets a test company for stress testing.
 *
 * @param supabase - Supabase client
 * @returns Company ID
 */
async function getOrCreateTestCompany(supabase: SupabaseClient): Promise<string> {
  const testCompanyName = 'Stress Test Company';
  const testCompanySlug = 'stress-test-company';

  // Check if test company exists
  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', testCompanySlug)
    .single();

  if (existing) {
    console.log(`  Using existing test company: ${existing.id}`);
    return existing.id;
  }

  // Create new test company
  const { data: created, error } = await supabase
    .from('companies')
    .insert({
      name: testCompanyName,
      slug: testCompanySlug,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create test company: ${error.message}`);
  }

  console.log(`  Created test company: ${created.id}`);
  return created.id;
}

/**
 * Clears existing stress test data for a clean run.
 *
 * @param supabase - Supabase client
 * @param companyId - Company ID to clear data for
 */
async function clearExistingData(
  supabase: SupabaseClient,
  companyId: string
): Promise<void> {
  console.log(`\nClearing existing stress test data...`);

  // Delete trips first (foreign key constraint)
  const { error: tripsError, count: tripsDeleted } = await supabase
    .from('trips')
    .delete({ count: 'exact' })
    .eq('company_id', companyId);

  if (tripsError) {
    console.warn(`  Warning: Could not delete trips: ${tripsError.message}`);
  } else {
    console.log(`  Deleted ${formatNumber(tripsDeleted || 0)} existing trips`);
  }

  // Delete employees
  const { error: employeesError, count: employeesDeleted } = await supabase
    .from('employees')
    .delete({ count: 'exact' })
    .eq('company_id', companyId);

  if (employeesError) {
    console.warn(`  Warning: Could not delete employees: ${employeesError.message}`);
  } else {
    console.log(`  Deleted ${formatNumber(employeesDeleted || 0)} existing employees`);
  }
}

/**
 * Inserts test employees into the database.
 *
 * @param supabase - Supabase client
 * @param employees - Employees to insert
 * @param companyId - Company ID
 * @returns Map of email -> employee ID
 */
async function insertEmployees(
  supabase: SupabaseClient,
  employees: StressTestEmployee[],
  companyId: string
): Promise<{ created: number; failed: number; idMap: Map<string, string> }> {
  console.log(`\nInserting ${formatNumber(employees.length)} employees...`);

  const idMap = new Map<string, string>();
  let created = 0;
  let failed = 0;

  const batches = chunkArray(employees, EMPLOYEE_BATCH_SIZE);
  const progress = createProgressLogger(batches.length, 'Employee batches');

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const records = batch.map(emp => ({
      company_id: companyId,
      name: emp.name,
      email: emp.email,
    }));

    const { data, error } = await supabase
      .from('employees')
      .insert(records)
      .select('id, email');

    if (error) {
      console.error(`  Batch ${i + 1} failed: ${error.message}`);
      failed += batch.length;
    } else if (data) {
      created += data.length;
      data.forEach(emp => idMap.set(emp.email, emp.id));
    }

    progress(i + 1);
  }

  console.log(`  Created ${formatNumber(created)} employees (${formatNumber(failed)} failed)`);
  return { created, failed, idMap };
}

/**
 * Inserts test trips into the database.
 *
 * @param supabase - Supabase client
 * @param trips - Trips to insert
 * @param companyId - Company ID
 * @param employeeIdMap - Map of email -> employee ID
 * @returns Count of created and failed trips
 */
async function insertTrips(
  supabase: SupabaseClient,
  trips: StressTestTrip[],
  companyId: string,
  employeeIdMap: Map<string, string>
): Promise<{ created: number; failed: number }> {
  console.log(`\nInserting ${formatNumber(trips.length)} trips...`);

  let created = 0;
  let failed = 0;

  const batches = chunkArray(trips, TRIP_BATCH_SIZE);
  const progress = createProgressLogger(batches.length, 'Trip batches');

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const records = batch
      .map(trip => {
        const employeeId = employeeIdMap.get(trip.employee_email);
        if (!employeeId) {
          console.warn(`  Warning: No employee ID for ${trip.employee_email}`);
          return null;
        }
        return {
          company_id: companyId,
          employee_id: employeeId,
          entry_date: trip.entry_date,
          exit_date: trip.exit_date,
          country: trip.country,
          purpose: 'Stress Test',
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (records.length === 0) {
      failed += batch.length;
      continue;
    }

    const { data, error } = await supabase
      .from('trips')
      .insert(records)
      .select('id');

    if (error) {
      console.error(`  Batch ${i + 1} failed: ${error.message}`);
      failed += batch.length;
    } else if (data) {
      created += data.length;
      failed += batch.length - data.length;
    }

    progress(i + 1);
  }

  console.log(`  Created ${formatNumber(created)} trips (${formatNumber(failed)} failed)`);
  return { created, failed };
}

/**
 * Inserts all stress test data into the database.
 *
 * @param employees - Test employees
 * @param trips - Test trips
 * @param clearFirst - Whether to clear existing data first
 * @returns Insertion result
 */
export async function insertStressTestData(
  employees: StressTestEmployee[],
  trips: StressTestTrip[],
  clearFirst: boolean = true
): Promise<InsertionResult> {
  const startTime = Date.now();
  console.log('\n========================================');
  console.log('INSERTING STRESS TEST DATA');
  console.log('========================================');

  const supabase = createAdminClient();

  // Get or create test company
  const companyId = await getOrCreateTestCompany(supabase);

  // Clear existing data if requested
  if (clearFirst) {
    await clearExistingData(supabase, companyId);
  }

  // Insert employees
  const { created: employeesCreated, failed: employeesFailed, idMap } = await insertEmployees(
    supabase,
    employees,
    companyId
  );

  // Insert trips
  const { created: tripsCreated, failed: tripsFailed } = await insertTrips(
    supabase,
    trips,
    companyId,
    idMap
  );

  const durationMs = Date.now() - startTime;

  console.log(`\nInsertion complete in ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`  Company ID: ${companyId}`);
  console.log(`  Employees: ${formatNumber(employeesCreated)} created, ${formatNumber(employeesFailed)} failed`);
  console.log(`  Trips: ${formatNumber(tripsCreated)} created, ${formatNumber(tripsFailed)} failed`);

  return {
    companyId,
    employeesCreated,
    employeesFailed,
    tripsCreated,
    tripsFailed,
    durationMs,
    employeeIdMap: idMap,
  };
}
