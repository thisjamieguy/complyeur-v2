/**
 * @fileoverview Test data cleanup utilities
 *
 * Provides functions to safely clean up test data from the database
 * after integration and E2E tests. Uses a test prefix convention
 * to identify test records.
 */

import { createClient } from '@supabase/supabase-js';

// Test data identifier prefix
export const TEST_PREFIX = 'TEST_';
export const TEST_EMAIL_DOMAIN = '@test.example.com';

/**
 * Create a test-specific Supabase client.
 * Falls back to environment variables if not provided.
 */
export function createTestClient(url?: string, key?: string) {
  const supabaseUrl = url || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = key || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and key are required for test cleanup');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Delete all test employees and their related data for a company.
 * Test employees are identified by names starting with TEST_ or
 * emails ending with @test.example.com
 */
export async function cleanupTestEmployees(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<{ deletedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let deletedCount = 0;

  try {
    // First, find all test employees
    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select('id, name, email')
      .eq('company_id', companyId)
      .or(`name.ilike.${TEST_PREFIX}%,email.ilike.%${TEST_EMAIL_DOMAIN}`);

    if (fetchError) {
      errors.push(`Failed to fetch test employees: ${fetchError.message}`);
      return { deletedCount, errors };
    }

    if (!employees || employees.length === 0) {
      return { deletedCount: 0, errors: [] };
    }

    const employeeIds = employees.map((e) => e.id);

    // Delete trips for these employees first (due to foreign key)
    const { error: tripError } = await supabase
      .from('trips')
      .delete()
      .in('employee_id', employeeIds);

    if (tripError) {
      errors.push(`Failed to delete trips: ${tripError.message}`);
    }

    // Delete the employees
    const { error: employeeError, count } = await supabase
      .from('employees')
      .delete()
      .in('id', employeeIds);

    if (employeeError) {
      errors.push(`Failed to delete employees: ${employeeError.message}`);
    } else {
      deletedCount = count || employeeIds.length;
    }
  } catch (err) {
    errors.push(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { deletedCount, errors };
}

/**
 * Delete all test trips for a company.
 * Test trips are identified by country code starting with TEST_
 * or by being linked to test employees.
 */
export async function cleanupTestTrips(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<{ deletedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let deletedCount = 0;

  try {
    // Find test employees first
    const { data: employees } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
      .or(`name.ilike.${TEST_PREFIX}%,email.ilike.%${TEST_EMAIL_DOMAIN}`);

    const employeeIds = employees?.map((e) => e.id) || [];

    if (employeeIds.length > 0) {
      const { error, count } = await supabase
        .from('trips')
        .delete()
        .in('employee_id', employeeIds);

      if (error) {
        errors.push(`Failed to delete trips: ${error.message}`);
      } else {
        deletedCount = count || 0;
      }
    }
  } catch (err) {
    errors.push(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { deletedCount, errors };
}

/**
 * Delete a test company and all its data.
 * Only deletes companies with names starting with TEST_
 */
export async function cleanupTestCompany(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    // Verify this is a test company
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    if (!company || !company.name.startsWith(TEST_PREFIX)) {
      return { success: false, errors: ['Refusing to delete non-test company'] };
    }

    // Clean up in order: trips -> employees -> profiles -> company
    await cleanupTestTrips(supabase, companyId);
    await cleanupTestEmployees(supabase, companyId);

    // Delete profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('company_id', companyId);

    if (profileError) {
      errors.push(`Failed to delete profiles: ${profileError.message}`);
    }

    // Delete company
    const { error: companyError } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId);

    if (companyError) {
      errors.push(`Failed to delete company: ${companyError.message}`);
    }
  } catch (err) {
    errors.push(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { success: errors.length === 0, errors };
}

/**
 * Create a test company for integration tests.
 * The company name will be prefixed with TEST_ for safe cleanup.
 */
export async function createTestCompany(
  supabase: ReturnType<typeof createClient>,
  name: string = 'Integration Test Company'
): Promise<{ id: string; name: string } | null> {
  const testName = name.startsWith(TEST_PREFIX) ? name : `${TEST_PREFIX}${name}`;

  const { data, error } = await supabase
    .from('companies')
    .insert({ name: testName })
    .select('id, name')
    .single();

  if (error) {
    console.error('Failed to create test company:', error.message);
    return null;
  }

  return data;
}

/**
 * Cleanup all test data matching the test patterns.
 * Use with caution - this will delete all data matching test patterns.
 */
export async function cleanupAllTestData(
  supabase: ReturnType<typeof createClient>
): Promise<{ companies: number; employees: number; trips: number; errors: string[] }> {
  const errors: string[] = [];
  let companies = 0;
  let employees = 0;
  let trips = 0;

  try {
    // Find all test companies
    const { data: testCompanies } = await supabase
      .from('companies')
      .select('id')
      .ilike('name', `${TEST_PREFIX}%`);

    if (testCompanies) {
      for (const company of testCompanies) {
        const tripResult = await cleanupTestTrips(supabase, company.id);
        trips += tripResult.deletedCount;
        errors.push(...tripResult.errors);

        const empResult = await cleanupTestEmployees(supabase, company.id);
        employees += empResult.deletedCount;
        errors.push(...empResult.errors);

        const companyResult = await cleanupTestCompany(supabase, company.id);
        if (companyResult.success) companies++;
        errors.push(...companyResult.errors);
      }
    }
  } catch (err) {
    errors.push(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { companies, employees, trips, errors };
}
