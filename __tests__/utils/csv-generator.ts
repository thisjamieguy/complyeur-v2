/**
 * @fileoverview CSV test data generator for import testing
 *
 * Generates CSV content for employee and trip imports with
 * configurable options and seeded random data for reproducibility.
 */

// Simple seeded random number generator (Mulberry32)
function createSeededRandom(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// Name generators (deterministic based on index)
// ============================================================================

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Lisa', 'Daniel', 'Nancy',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
];

const NATIONALITIES = ['GB', 'US', 'CA', 'AU', 'NZ', 'JP', 'KR', 'SG', 'BR', 'MX'];

const SCHENGEN_COUNTRIES = [
  'AT', 'BE', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IS', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL',
  'PT', 'SK', 'SI', 'ES', 'SE', 'CH',
];

function getName(index: number, random: () => number): { firstName: string; lastName: string } {
  const firstIdx = Math.floor(random() * FIRST_NAMES.length);
  const lastIdx = Math.floor(random() * LAST_NAMES.length);
  return {
    firstName: FIRST_NAMES[firstIdx],
    lastName: LAST_NAMES[lastIdx],
  };
}

function generatePassport(index: number, random: () => number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letter1 = letters[Math.floor(random() * 26)];
  const letter2 = letters[Math.floor(random() * 26)];
  const num = String(Math.floor(random() * 900000) + 100000);
  return `${letter1}${letter2}${num}`;
}

function generateEmail(firstName: string, lastName: string, index: number): string {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@test.example.com`;
}

// ============================================================================
// Employee CSV Generator
// ============================================================================

export interface EmployeeCSVOptions {
  count: number;
  seed?: number;
  includePassport?: boolean;
  includeNationality?: boolean;
  includeInvalidRows?: number; // Number of invalid rows to include
}

export function generateEmployeeCSV(options: EmployeeCSVOptions): string {
  const { count, seed = 12345, includePassport = true, includeNationality = true, includeInvalidRows = 0 } = options;
  const random = createSeededRandom(seed);

  // Required fields: first_name, last_name, email (per REQUIRED_EMPLOYEE_FIELDS)
  const headers = ['first_name', 'last_name', 'email'];
  if (includePassport) headers.push('passport_number');
  if (includeNationality) headers.push('nationality');

  const rows: string[] = [headers.join(',')];

  for (let i = 0; i < count; i++) {
    const { firstName, lastName } = getName(i, random);
    const email = generateEmail(firstName, lastName, i);
    const passport = generatePassport(i, random);
    const nationality = NATIONALITIES[Math.floor(random() * NATIONALITIES.length)];

    const values = [firstName, lastName, email];
    if (includePassport) values.push(passport);
    if (includeNationality) values.push(nationality);

    rows.push(values.join(','));
  }

  // Add invalid rows at the end (matching new column order: first_name, last_name, email, passport_number, nationality)
  for (let i = 0; i < includeInvalidRows; i++) {
    if (i % 3 === 0) {
      // Invalid email
      rows.push(`Invalid,User${i},not-an-email,XX${i}00000,GB`);
    } else if (i % 3 === 1) {
      // Missing first_name
      rows.push(`,LastOnly${i},missingfirst${i}@test.com,XX${i}00001,GB`);
    } else {
      // Missing email
      rows.push(`NoEmail,User${i},,XX${i}00002,GB`);
    }
  }

  return rows.join('\n');
}

// ============================================================================
// Trip CSV Generator
// ============================================================================

export interface TripCSVOptions {
  count: number;
  seed?: number;
  employees: Array<{ email: string }>; // Employees to assign trips to
  startDate?: string; // Base date for trip generation (YYYY-MM-DD)
  dateFormat?: 'iso' | 'uk' | 'us' | 'excel'; // Output date format
  includeInvalidRows?: number;
}

function formatDate(date: Date, format: string): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  switch (format) {
    case 'uk':
      return `${day}/${month}/${year}`;
    case 'us':
      return `${month}/${day}/${year}`;
    case 'excel':
      // Excel serial date (days since 1900-01-01, with the leap year bug)
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const days = Math.floor((date.getTime() - excelEpoch.getTime()) / (24 * 60 * 60 * 1000));
      return String(days);
    case 'iso':
    default:
      return `${year}-${month}-${day}`;
  }
}

export function generateTripCSV(options: TripCSVOptions): string {
  const {
    count,
    seed = 54321,
    employees,
    startDate = '2025-10-15',
    dateFormat = 'iso',
    includeInvalidRows = 0,
  } = options;

  if (employees.length === 0) {
    throw new Error('Must provide at least one employee for trip generation');
  }

  const random = createSeededRandom(seed);
  const baseDate = new Date(startDate + 'T00:00:00.000Z');

  const headers = ['email', 'entry_date', 'exit_date', 'country'];
  const rows: string[] = [headers.join(',')];

  for (let i = 0; i < count; i++) {
    // Assign to random employee
    const employee = employees[Math.floor(random() * employees.length)];

    // Generate trip dates (spread across time from base date)
    const daysOffset = Math.floor(random() * 120); // Up to 120 days from base
    const tripLength = Math.floor(random() * 14) + 1; // 1-14 days

    const entryDate = new Date(baseDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);
    const exitDate = new Date(entryDate.getTime() + tripLength * 24 * 60 * 60 * 1000);

    const country = SCHENGEN_COUNTRIES[Math.floor(random() * SCHENGEN_COUNTRIES.length)];

    rows.push([
      employee.email,
      formatDate(entryDate, dateFormat),
      formatDate(exitDate, dateFormat),
      country,
    ].join(','));
  }

  // Add invalid rows
  for (let i = 0; i < includeInvalidRows; i++) {
    if (i % 3 === 0) {
      // Invalid date
      rows.push(`invalid${i}@test.com,not-a-date,2025-11-10,FR`);
    } else if (i % 3 === 1) {
      // Exit before entry
      rows.push(`invalid${i}@test.com,2025-11-15,2025-11-10,FR`);
    } else {
      // Invalid country
      rows.push(`invalid${i}@test.com,2025-11-01,2025-11-10,XX`);
    }
  }

  return rows.join('\n');
}

// ============================================================================
// Stress Test Data Generator
// ============================================================================

export interface StressTestDataOptions {
  employees: number;
  tripsPerEmployee: number;
  seed?: number;
  startDate?: string;
}

export interface StressTestEmployee {
  name: string;
  email: string;
  passport: string;
  nationality: string;
  trips: Array<{
    entry_date: string;
    exit_date: string;
    country: string;
  }>;
  expected: {
    daysUsed: number;
    daysRemaining: number;
    status: 'green' | 'amber' | 'red';
  };
}

export interface StressTestData {
  employees: StressTestEmployee[];
  employeeCSV: string;
  tripCSV: string;
}

/**
 * Generate stress test data with pre-calculated expected values.
 * Uses the oracle calculator logic to determine expected compliance.
 */
export function generateStressTestData(options: StressTestDataOptions): StressTestData {
  const {
    employees: employeeCount,
    tripsPerEmployee,
    seed = 99999,
    startDate = '2025-10-15',
  } = options;

  const random = createSeededRandom(seed);
  const baseDate = new Date(startDate + 'T00:00:00.000Z');
  const complianceStart = new Date('2025-10-12T00:00:00.000Z');

  const stressEmployees: StressTestEmployee[] = [];

  for (let e = 0; e < employeeCount; e++) {
    const { firstName, lastName } = getName(e, random);
    const name = `${firstName} ${lastName}`;
    const email = generateEmail(firstName, lastName, e);
    const passport = generatePassport(e, random);
    const nationality = NATIONALITIES[Math.floor(random() * NATIONALITIES.length)];

    const trips: StressTestEmployee['trips'] = [];
    const presenceDays = new Set<string>();

    for (let t = 0; t < tripsPerEmployee; t++) {
      const daysOffset = Math.floor(random() * 150);
      const tripLength = Math.floor(random() * 10) + 1;

      const entryDate = new Date(baseDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);
      const exitDate = new Date(entryDate.getTime() + tripLength * 24 * 60 * 60 * 1000);

      const country = SCHENGEN_COUNTRIES[Math.floor(random() * SCHENGEN_COUNTRIES.length)];

      const entryStr = entryDate.toISOString().split('T')[0];
      const exitStr = exitDate.toISOString().split('T')[0];

      trips.push({
        entry_date: entryStr,
        exit_date: exitStr,
        country,
      });

      // Track presence days for oracle calculation
      let current = new Date(entryDate);
      while (current <= exitDate) {
        if (current >= complianceStart) {
          presenceDays.add(current.toISOString().split('T')[0]);
        }
        current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    // Calculate expected compliance (simplified oracle)
    // Reference date: 180 days from start
    const refDate = new Date(baseDate.getTime() + 180 * 24 * 60 * 60 * 1000);
    const windowStart = new Date(refDate.getTime() - 180 * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(refDate.getTime() - 24 * 60 * 60 * 1000);

    let daysUsed = 0;
    for (const dayKey of Array.from(presenceDays)) {
      const day = new Date(dayKey + 'T00:00:00.000Z');
      if (day >= windowStart && day <= windowEnd && day >= complianceStart) {
        daysUsed++;
      }
    }

    const daysRemaining = 90 - daysUsed;
    let status: 'green' | 'amber' | 'red';
    if (daysRemaining >= 16) status = 'green';
    else if (daysRemaining >= 1) status = 'amber';
    else status = 'red';

    stressEmployees.push({
      name,
      email,
      passport,
      nationality,
      trips,
      expected: {
        daysUsed,
        daysRemaining,
        status,
      },
    });
  }

  // Generate CSVs
  const employeeRows = ['name,email,passport,nationality'];
  const tripRows = ['email,entry_date,exit_date,country'];

  for (const emp of stressEmployees) {
    employeeRows.push(`${emp.name},${emp.email},${emp.passport},${emp.nationality}`);
    for (const trip of emp.trips) {
      tripRows.push(`${emp.email},${trip.entry_date},${trip.exit_date},${trip.country}`);
    }
  }

  return {
    employees: stressEmployees,
    employeeCSV: employeeRows.join('\n'),
    tripCSV: tripRows.join('\n'),
  };
}
