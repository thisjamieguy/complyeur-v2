/**
 * @fileoverview Integration tests for database insertion logic.
 *
 * These tests verify the insertion logic by testing:
 * - Input validation and row filtering
 * - Duplicate detection logic
 * - Error handling patterns
 * - Format-specific routing
 *
 * Note: These tests use a simplified mock approach due to the complexity
 * of Supabase's chainable query builder. For full E2E database tests,
 * see the Playwright E2E test suite.
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import type {
  ParsedEmployeeRow,
  ParsedTripRow,
  ValidatedRow,
  DuplicateOptions,
} from '@/types/import';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a validated employee row for testing.
 */
function createValidatedEmployeeRow(
  overrides: Partial<ParsedEmployeeRow> & { row_number?: number; is_valid?: boolean } = {}
): ValidatedRow<ParsedEmployeeRow> {
  const {
    row_number = 2,
    is_valid = true,
    first_name = 'John',
    last_name = 'Doe',
    email = 'john.doe@test.com',
    nationality,
    passport_number,
  } = overrides;

  return {
    row_number,
    data: {
      row_number,
      first_name,
      last_name,
      email,
      nationality,
      passport_number,
    },
    is_valid,
    errors: [],
    warnings: [],
  };
}

/**
 * Creates a validated trip row for testing.
 */
function createValidatedTripRow(
  overrides: Partial<ParsedTripRow> & { row_number?: number; is_valid?: boolean } = {}
): ValidatedRow<ParsedTripRow> {
  const {
    row_number = 2,
    is_valid = true,
    employee_email = 'john.doe@test.com',
    employee_name,
    entry_date = '2025-11-01',
    exit_date = '2025-11-10',
    country = 'FR',
    purpose,
  } = overrides;

  return {
    row_number,
    data: {
      row_number,
      employee_email,
      employee_name,
      entry_date,
      exit_date,
      country,
      purpose,
    },
    is_valid,
    errors: [],
    warnings: [],
  };
}

// ============================================================================
// Comprehensive Mock Builder
// ============================================================================

/**
 * Creates a comprehensive mock Supabase client with proper chaining support.
 */
function createComprehensiveMock(options: {
  profile?: { company_id: string } | null;
  profileError?: { message: string } | null;
  session?: { company_id: string } | null;
  sessionError?: { message: string } | null;
  existingEmployees?: Array<{ id: string; name: string; email?: string }>;
  insertedEmployees?: Array<{ id: string; name?: string; email?: string; company_id?: string }>;
  employeeInsertError?: { message: string } | null;
  employeeUpdateError?: { message: string } | null;
  existingTrips?: Array<{ id: string; employee_id: string; entry_date: string; exit_date: string }>;
  insertedTrips?: Array<{ id: string }>;
  tripInsertError?: { message: string } | null;
}) {
  const {
    profile = { company_id: 'company-123' },
    profileError = null,
    session = { company_id: 'company-123' },
    sessionError = null,
    existingEmployees = [],
    insertedEmployees = [],
    employeeInsertError = null,
    employeeUpdateError = null,
    existingTrips = [],
    insertedTrips = [],
    tripInsertError = null,
  } = options;

  // Create chainable mock for any builder
  const createChainBuilder = (resolveData: unknown, resolveError: unknown = null) => {
    const builder: Record<string, Mock | ((fn: (val: unknown) => void) => void)> = {};

    // Make all methods return the builder for chaining
    ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'is', 'not', 'in', 'filter', 'order', 'limit', 'range'].forEach(method => {
      builder[method] = vi.fn(() => builder);
    });

    // Terminal methods
    builder.single = vi.fn().mockResolvedValue({ data: resolveData, error: resolveError });
    builder.maybeSingle = vi.fn().mockResolvedValue({ data: resolveData, error: resolveError });

    // Promise-like behavior for await
    builder.then = (resolve: (val: { data: unknown; error: unknown }) => void) => {
      resolve({ data: resolveData, error: resolveError });
    };

    return builder;
  };

  // Profiles builder
  const profilesBuilder = createChainBuilder(profile, profileError);

  // Sessions builder
  const sessionsBuilder = createChainBuilder(session, sessionError);

  // Employees builder with special handling for insert().select() chain
  const employeesBuilder: Record<string, Mock | ((fn: (val: unknown) => void) => void)> = {};
  ['select', 'eq', 'not'].forEach(method => {
    employeesBuilder[method] = vi.fn(() => employeesBuilder);
  });
  employeesBuilder.is = vi.fn().mockResolvedValue({ data: existingEmployees, error: null });

  // insert() returns a builder with select()
  const empInsertBuilder: Record<string, Mock> = {};
  empInsertBuilder.select = vi.fn().mockResolvedValue({
    data: employeeInsertError ? null : insertedEmployees,
    error: employeeInsertError,
  });
  employeesBuilder.insert = vi.fn(() => empInsertBuilder);

  // update() returns a builder with eq()
  const empUpdateBuilder: Record<string, Mock> = {};
  empUpdateBuilder.eq = vi.fn().mockResolvedValue({ error: employeeUpdateError });
  employeesBuilder.update = vi.fn(() => empUpdateBuilder);

  // Trips builder with special handling
  const tripsBuilder: Record<string, Mock | ((fn: (val: unknown) => void) => void)> = {};
  ['select'].forEach(method => {
    tripsBuilder[method] = vi.fn(() => tripsBuilder);
  });
  tripsBuilder.eq = vi.fn().mockResolvedValue({ data: existingTrips, error: null });

  // insert() returns a builder with select()
  const tripInsertBuilder: Record<string, Mock> = {};
  tripInsertBuilder.select = vi.fn().mockResolvedValue({
    data: tripInsertError ? null : insertedTrips,
    error: tripInsertError,
  });
  tripsBuilder.insert = vi.fn(() => tripInsertBuilder);

  // Audit log builder
  const auditBuilder: Record<string, Mock> = {};
  auditBuilder.insert = vi.fn().mockResolvedValue({ data: null, error: null });

  // Main from() router
  const from = vi.fn((table: string) => {
    switch (table) {
      case 'profiles':
        return profilesBuilder;
      case 'import_sessions':
        return sessionsBuilder;
      case 'employees':
        return employeesBuilder;
      case 'trips':
        return tripsBuilder;
      case 'audit_log':
        return auditBuilder;
      default:
        return createChainBuilder(null, null);
    }
  });

  return {
    from,
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
    employeesBuilder,
    tripsBuilder,
    empInsertBuilder,
    tripInsertBuilder,
  };
}

// ============================================================================
// Module Mocks
// ============================================================================

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/security/tenant-access', () => ({
  requireCompanyAccess: vi.fn().mockResolvedValue(undefined),
}));

// ============================================================================
// Test Suite
// ============================================================================

describe('Import Database Insertion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // Employee Insertion Tests
  // ============================================================================
  describe('Employee Insertion', () => {
    it('inserts single employee with all fields', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createComprehensiveMock({
        existingEmployees: [],
        insertedEmployees: [{ id: 'emp-123', name: 'John Doe', email: 'john.doe@test.com' }],
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { insertValidRows } = await import('@/lib/import/inserter');
      const rows = [createValidatedEmployeeRow()];
      const result = await insertValidRows('session-123', 'employees', rows);

      expect(result.employees_created).toBe(1);
      expect(result.success).toBe(true);
      expect(mockClient.from).toHaveBeenCalledWith('employees');
    });

    it('inserts batch of employees (10+)', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const batchSize = 15;
      const insertedEmployees = Array.from({ length: batchSize }, (_, i) => ({
        id: `emp-${i}`,
        name: `Employee ${i}`,
        email: `employee${i}@test.com`,
      }));

      const mockClient = createComprehensiveMock({
        existingEmployees: [],
        insertedEmployees,
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { insertValidRows } = await import('@/lib/import/inserter');
      const rows = Array.from({ length: batchSize }, (_, i) =>
        createValidatedEmployeeRow({
          row_number: i + 2,
          first_name: 'Employee',
          last_name: `${i}`,
          email: `employee${i}@test.com`,
        })
      );

      const result = await insertValidRows('session-123', 'employees', rows);

      expect(result.employees_created).toBe(batchSize);
      expect(result.success).toBe(true);
    });

    it('handles duplicate email with strategy skip (does not insert)', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createComprehensiveMock({
        existingEmployees: [{ id: 'existing-emp', name: 'Existing', email: 'john.doe@test.com' }],
        insertedEmployees: [],
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { insertValidRows } = await import('@/lib/import/inserter');
      const rows = [createValidatedEmployeeRow({ email: 'john.doe@test.com' })];
      const options: DuplicateOptions = { employees: 'skip', trips: 'skip' };

      const result = await insertValidRows('session-123', 'employees', rows, options);

      expect(result.employees_created).toBe(0);
      expect(result.warnings.some(w => w.message.includes('already exists'))).toBe(true);
    });

    it('handles duplicate email with strategy update', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createComprehensiveMock({
        existingEmployees: [{ id: 'existing-emp', name: 'Old Name', email: 'john.doe@test.com' }],
        insertedEmployees: [],
        employeeUpdateError: null,
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { insertValidRows } = await import('@/lib/import/inserter');
      const rows = [createValidatedEmployeeRow({ first_name: 'New', last_name: 'Name', email: 'john.doe@test.com' })];
      const options: DuplicateOptions = { employees: 'update', trips: 'skip' };

      const result = await insertValidRows('session-123', 'employees', rows, options);

      expect(result.employees_updated).toBe(1);
      expect(result.employees_created).toBe(0);
    });

    it('returns error when profile not found', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createComprehensiveMock({
        profile: null,
        profileError: { message: 'Profile not found' },
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { insertValidRows } = await import('@/lib/import/inserter');
      const rows = [createValidatedEmployeeRow()];
      const result = await insertValidRows('session-123', 'employees', rows);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('returns error when import session not found', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createComprehensiveMock({
        session: null,
        sessionError: { message: 'Session not found' },
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { insertValidRows } = await import('@/lib/import/inserter');
      const rows = [createValidatedEmployeeRow()];
      const result = await insertValidRows('session-123', 'employees', rows);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('session'))).toBe(true);
    });

    it('handles database insert error gracefully', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createComprehensiveMock({
        existingEmployees: [],
        employeeInsertError: { message: 'Database constraint violation' },
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { insertValidRows } = await import('@/lib/import/inserter');
      const rows = [createValidatedEmployeeRow()];
      const result = await insertValidRows('session-123', 'employees', rows);

      expect(result.errors.some(e => e.message.includes('Database'))).toBe(true);
    });
  });

  // ============================================================================
  // Trip Insertion Tests
  // ============================================================================
  describe('Trip Insertion', () => {
    it('inserts single trip linked to employee', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createComprehensiveMock({
        existingEmployees: [{ id: 'emp-123', name: 'John Doe', email: 'john.doe@test.com' }],
        existingTrips: [],
        insertedTrips: [{ id: 'trip-123' }],
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { insertValidRows } = await import('@/lib/import/inserter');
      const rows = [createValidatedTripRow({ employee_email: 'john.doe@test.com' })];
      const result = await insertValidRows('session-123', 'trips', rows);

      expect(result.trips_created).toBe(1);
      expect(result.success).toBe(true);
    });

    it('handles duplicate trip detection (skips with warning)', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createComprehensiveMock({
        existingEmployees: [{ id: 'emp-123', name: 'John Doe', email: 'john.doe@test.com' }],
        existingTrips: [{
          id: 'existing-trip',
          employee_id: 'emp-123',
          entry_date: '2025-11-01',
          exit_date: '2025-11-10',
        }],
        insertedTrips: [],
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { insertValidRows } = await import('@/lib/import/inserter');
      const rows = [createValidatedTripRow({
        employee_email: 'john.doe@test.com',
        entry_date: '2025-11-01',
        exit_date: '2025-11-10',
      })];

      const result = await insertValidRows('session-123', 'trips', rows);

      expect(result.trips_created).toBe(0);
      expect(result.trips_skipped).toBe(1);
      expect(result.warnings.some(w => w.message.includes('already exists'))).toBe(true);
    });

    it('auto-creates employees for unknown emails', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      // No existing employees, but inserter will auto-create
      const mockClient = createComprehensiveMock({
        existingEmployees: [],
        insertedEmployees: [{ id: 'new-emp', name: 'Unknown', email: 'unknown@test.com' }],
        existingTrips: [],
        insertedTrips: [{ id: 'trip-123' }],
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { insertValidRows } = await import('@/lib/import/inserter');
      const rows = [createValidatedTripRow({ employee_email: 'unknown@test.com' })];
      const result = await insertValidRows('session-123', 'trips', rows);

      expect(result.employees_created).toBe(1);
      expect(result.trips_created).toBe(1);
    });
  });

  // ============================================================================
  // Access Control Tests
  // ============================================================================
  describe('Access Control', () => {
    it('rejects insert if company access denied', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access');

      const mockClient = createComprehensiveMock({});
      vi.mocked(createClient).mockResolvedValue(mockClient as never);
      vi.mocked(requireCompanyAccess).mockRejectedValue(new Error('Access denied'));

      const { insertValidRows } = await import('@/lib/import/inserter');
      const rows = [createValidatedEmployeeRow()];
      const result = await insertValidRows('session-123', 'employees', rows);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('Access denied'))).toBe(true);
    });
  });

  // ============================================================================
  // Format Handling Tests
  // ============================================================================
  describe('Format Handling', () => {
    it('handles employees format', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createComprehensiveMock({
        existingEmployees: [],
        insertedEmployees: [{ id: 'emp-123' }],
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { insertValidRows } = await import('@/lib/import/inserter');
      const rows = [createValidatedEmployeeRow()];
      const result = await insertValidRows('session-123', 'employees', rows);

      expect(result.employees_created).toBe(1);
    });

    it('handles trips format', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createComprehensiveMock({
        existingEmployees: [{ id: 'emp-123', name: 'John', email: 'john.doe@test.com' }],
        existingTrips: [],
        insertedTrips: [{ id: 'trip-123' }],
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { insertValidRows } = await import('@/lib/import/inserter');
      const rows = [createValidatedTripRow()];
      const result = await insertValidRows('session-123', 'trips', rows);

      expect(result.trips_created).toBe(1);
    });

    it('handles gantt format (same as trips)', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createComprehensiveMock({
        existingEmployees: [{ id: 'emp-123', name: 'John', email: 'john.doe@test.com' }],
        existingTrips: [],
        insertedTrips: [{ id: 'trip-123' }],
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { insertValidRows } = await import('@/lib/import/inserter');
      const rows = [createValidatedTripRow()];
      const result = await insertValidRows('session-123', 'gantt', rows);

      expect(result.trips_created).toBe(1);
    });

    it('returns error for unsupported format', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createComprehensiveMock({});
      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { insertValidRows } = await import('@/lib/import/inserter');
      const rows = [createValidatedEmployeeRow()];
      const result = await insertValidRows('session-123', 'unknown' as never, rows);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('Unsupported'))).toBe(true);
    });
  });

  // ============================================================================
  // Validation Filtering Tests
  // ============================================================================
  describe('Validation Filtering', () => {
    it('only processes valid rows', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createComprehensiveMock({
        existingEmployees: [],
        insertedEmployees: [{ id: 'emp-1' }, { id: 'emp-2' }],
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { insertValidRows } = await import('@/lib/import/inserter');
      const rows = [
        createValidatedEmployeeRow({ is_valid: true, email: 'valid1@test.com' }),
        createValidatedEmployeeRow({ is_valid: false, email: 'invalid@test.com' }),
        createValidatedEmployeeRow({ is_valid: true, email: 'valid2@test.com' }),
      ];

      const result = await insertValidRows('session-123', 'employees', rows);

      // Only 2 valid rows should be inserted
      expect(result.employees_created).toBe(2);
    });

    it('collects warnings from invalid rows', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createComprehensiveMock({
        existingEmployees: [],
        insertedEmployees: [{ id: 'emp-1' }],
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { insertValidRows } = await import('@/lib/import/inserter');

      // Create a row with pre-populated warning
      const rowWithWarning = createValidatedEmployeeRow({ is_valid: true, email: 'valid@test.com' });
      rowWithWarning.warnings.push({
        row: 2,
        column: 'name',
        value: 'Test',
        message: 'Name is similar to existing employee',
        severity: 'warning',
      });

      const result = await insertValidRows('session-123', 'employees', [rowWithWarning]);

      expect(result.warnings.some(w => w.message.includes('similar'))).toBe(true);
    });
  });

  // ============================================================================
  // Batch Insert Tests
  // ============================================================================
  describe('Batch Operations', () => {
    it('inserts large batch of trips', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const batchSize = 50;
      const employees = Array.from({ length: 5 }, (_, i) => ({
        id: `emp-${i}`,
        name: `Employee ${i}`,
        email: `employee${i}@test.com`,
      }));

      const mockClient = createComprehensiveMock({
        existingEmployees: employees,
        existingTrips: [],
        insertedTrips: Array.from({ length: batchSize }, (_, i) => ({ id: `trip-${i}` })),
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { insertValidRows } = await import('@/lib/import/inserter');
      const rows = Array.from({ length: batchSize }, (_, i) =>
        createValidatedTripRow({
          row_number: i + 2,
          employee_email: `employee${i % 5}@test.com`,
          entry_date: `2025-11-${String((i % 28) + 1).padStart(2, '0')}`,
          exit_date: `2025-11-${String((i % 28) + 5).padStart(2, '0')}`,
        })
      );

      const result = await insertValidRows('session-123', 'trips', rows);

      expect(result.trips_created).toBe(batchSize);
      expect(result.success).toBe(true);
    });
  });
});
