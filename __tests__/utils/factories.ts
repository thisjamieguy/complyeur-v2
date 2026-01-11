/**
 * @fileoverview Test data factories
 *
 * Creates realistic test data for various scenarios.
 * All factories return valid data by default with easy overrides.
 */

import { v4 as uuid } from 'crypto';
import type { Trip } from '@/lib/compliance/types';

// Simple UUID generator (no external dependency needed in tests)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// Date Helpers
// ============================================================================

/**
 * Create a date string in YYYY-MM-DD format
 */
export function dateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Create a Date object from a date string
 */
export function createDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00.000Z');
}

/**
 * Add days to a date string
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00.000Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Generate an array of consecutive date strings
 */
export function generateDateRange(start: string, count: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    dates.push(addDays(start, i));
  }
  return dates;
}

// ============================================================================
// Trip Factories
// ============================================================================

export interface TripFactoryOptions {
  id?: string;
  entryDate?: string | Date;
  exitDate?: string | Date;
  country?: string;
}

/**
 * Create a compliance engine Trip object
 */
export function createTrip(options: TripFactoryOptions = {}): Trip {
  const entryDate =
    options.entryDate instanceof Date
      ? options.entryDate
      : createDate(options.entryDate ?? '2025-11-01');

  const exitDate =
    options.exitDate instanceof Date
      ? options.exitDate
      : createDate(options.exitDate ?? '2025-11-10');

  return {
    id: options.id,
    entryDate,
    exitDate,
    country: options.country ?? 'FR',
  };
}

/**
 * Create a database Trip record
 */
export interface DbTripOptions {
  id?: string;
  employee_id?: string;
  country?: string;
  entry_date?: string;
  exit_date?: string;
  purpose?: string | null;
  job_ref?: string | null;
  is_private?: boolean;
  ghosted?: boolean;
  created_at?: string;
}

export function createDbTrip(options: DbTripOptions = {}) {
  return {
    id: options.id ?? generateUUID(),
    employee_id: options.employee_id ?? generateUUID(),
    country: options.country ?? 'FR',
    entry_date: options.entry_date ?? '2025-11-01',
    exit_date: options.exit_date ?? '2025-11-10',
    purpose: options.purpose ?? null,
    job_ref: options.job_ref ?? null,
    is_private: options.is_private ?? false,
    ghosted: options.ghosted ?? false,
    created_at: options.created_at ?? new Date().toISOString(),
  };
}

// ============================================================================
// Employee Factories
// ============================================================================

export interface EmployeeFactoryOptions {
  id?: string;
  company_id?: string;
  name?: string;
  is_deleted?: boolean;
  created_at?: string;
}

export function createEmployee(options: EmployeeFactoryOptions = {}) {
  return {
    id: options.id ?? generateUUID(),
    company_id: options.company_id ?? generateUUID(),
    name: options.name ?? 'John Doe',
    is_deleted: options.is_deleted ?? false,
    created_at: options.created_at ?? new Date().toISOString(),
  };
}

// ============================================================================
// Company Factories
// ============================================================================

export interface CompanyFactoryOptions {
  id?: string;
  name?: string;
  created_at?: string;
}

export function createCompany(options: CompanyFactoryOptions = {}) {
  return {
    id: options.id ?? generateUUID(),
    name: options.name ?? 'Test Company Ltd',
    created_at: options.created_at ?? new Date().toISOString(),
  };
}

// ============================================================================
// User/Profile Factories
// ============================================================================

export interface ProfileFactoryOptions {
  id?: string;
  company_id?: string;
  role?: 'admin' | 'user';
  created_at?: string;
}

export function createProfile(options: ProfileFactoryOptions = {}) {
  return {
    id: options.id ?? generateUUID(),
    company_id: options.company_id ?? generateUUID(),
    role: options.role ?? 'admin',
    created_at: options.created_at ?? new Date().toISOString(),
  };
}

// ============================================================================
// Compliance Config Factories
// ============================================================================

import type { ComplianceConfig } from '@/lib/compliance/types';

export interface ConfigFactoryOptions {
  mode?: 'audit' | 'planning';
  referenceDate?: string | Date;
  complianceStartDate?: string | Date;
  limit?: number;
}

export function createConfig(options: ConfigFactoryOptions = {}): ComplianceConfig {
  const referenceDate =
    options.referenceDate instanceof Date
      ? options.referenceDate
      : createDate(options.referenceDate ?? '2026-01-01');

  const complianceStartDate =
    options.complianceStartDate instanceof Date
      ? options.complianceStartDate
      : createDate(options.complianceStartDate ?? '2025-10-12');

  return {
    mode: options.mode ?? 'audit',
    referenceDate,
    complianceStartDate,
    limit: options.limit,
  };
}

// ============================================================================
// Scenario Factories (Complex Test Data)
// ============================================================================

/**
 * Create a set of trips that result in exactly N days used
 */
export function createTripsWithDaysUsed(
  daysUsed: number,
  startDate: string = '2025-10-12'
): Trip[] {
  const exitDate = addDays(startDate, daysUsed - 1);
  return [createTrip({ entryDate: startDate, exitDate })];
}

/**
 * Create overlapping trips scenario
 */
export function createOverlappingTrips(): Trip[] {
  return [
    createTrip({ entryDate: '2025-11-01', exitDate: '2025-11-10', country: 'FR' }),
    createTrip({ entryDate: '2025-11-05', exitDate: '2025-11-15', country: 'DE' }),
  ];
}

/**
 * Create trips with mixed Schengen and non-Schengen countries
 */
export function createMixedCountryTrips(): Trip[] {
  return [
    createTrip({ entryDate: '2025-11-01', exitDate: '2025-11-10', country: 'FR' }),
    createTrip({ entryDate: '2025-11-15', exitDate: '2025-11-25', country: 'IE' }), // Ireland - not Schengen
    createTrip({ entryDate: '2025-12-01', exitDate: '2025-12-10', country: 'DE' }),
  ];
}

/**
 * Create a trip that spans the compliance start date
 */
export function createTripSpanningComplianceStart(): Trip[] {
  return [createTrip({ entryDate: '2025-10-01', exitDate: '2025-10-20' })];
}

/**
 * Create multi-tenant test data (two companies with isolated data)
 */
export function createMultiTenantScenario() {
  const companyA = createCompany({ id: 'company-a-uuid', name: 'Company A' });
  const companyB = createCompany({ id: 'company-b-uuid', name: 'Company B' });

  const employeeA1 = createEmployee({
    id: 'employee-a1-uuid',
    company_id: companyA.id,
    name: 'Alice A',
  });
  const employeeA2 = createEmployee({
    id: 'employee-a2-uuid',
    company_id: companyA.id,
    name: 'Bob A',
  });
  const employeeB1 = createEmployee({
    id: 'employee-b1-uuid',
    company_id: companyB.id,
    name: 'Charlie B',
  });

  const tripA1 = createDbTrip({
    id: 'trip-a1-uuid',
    employee_id: employeeA1.id,
    country: 'FR',
    entry_date: '2025-11-01',
    exit_date: '2025-11-10',
  });
  const tripB1 = createDbTrip({
    id: 'trip-b1-uuid',
    employee_id: employeeB1.id,
    country: 'DE',
    entry_date: '2025-11-05',
    exit_date: '2025-11-15',
  });

  const profileA = createProfile({ id: 'user-a-uuid', company_id: companyA.id });
  const profileB = createProfile({ id: 'user-b-uuid', company_id: companyB.id });

  return {
    companyA,
    companyB,
    employeeA1,
    employeeA2,
    employeeB1,
    tripA1,
    tripB1,
    profileA,
    profileB,
  };
}
