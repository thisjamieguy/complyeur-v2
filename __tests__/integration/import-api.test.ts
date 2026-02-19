/**
 * @fileoverview Integration tests for import API/server actions.
 *
 * Tests the server actions in app/(dashboard)/import/actions.ts:
 * - createImportSession
 * - getImportSession
 * - updateSessionStatus
 * - saveParsedData
 * - executeImport
 * - deleteImportSession
 * - Column mapping actions
 *
 * These tests verify:
 * - Authentication and authorization
 * - Input validation
 * - Rate limiting behavior
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import type { ImportFormat, ImportStatus, DuplicateOptions } from '@/types/import';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a mock File object for testing.
 */
function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const content = new ArrayBuffer(size);
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

/**
 * Creates a FormData with file and format for createImportSession.
 */
function createImportFormData(
  file: File,
  format: ImportFormat
): FormData {
  const formData = new FormData();
  formData.set('file', file);
  formData.set('format', format);
  return formData;
}

// ============================================================================
// Comprehensive Mock Builder for Server Actions
// ============================================================================

function createServerActionMock(options: {
  user?: { id: string } | null;
  authError?: { message: string } | null;
  profile?: { company_id: string; role: string } | null;
  profileError?: { message: string } | null;
  session?: Record<string, unknown> | null;
  sessionError?: { message: string } | null;
  insertResult?: Record<string, unknown> | null;
  insertError?: { message: string } | null;
  canBulkImport?: boolean;
  mfaOk?: boolean;
  rateLimitAllowed?: boolean;
  rateLimitError?: string;
}) {
  const {
    user = { id: 'test-user-id' },
    authError = null,
    profile = { company_id: 'company-123', role: 'user' },
    profileError = null,
    session = null,
    sessionError = null,
    insertResult = null,
    insertError = null,
    canBulkImport = true,
    mfaOk = true,
    rateLimitAllowed = true,
    rateLimitError = 'Rate limit exceeded',
  } = options;

  // Create chainable builder
  const createChainBuilder = (resolveData: unknown, resolveError: unknown = null) => {
    const builder: Record<string, Mock | ((fn: (val: unknown) => void) => void)> = {};

    ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'is', 'not', 'in', 'filter', 'order', 'limit', 'range'].forEach(method => {
      builder[method] = vi.fn(() => builder);
    });

    builder.single = vi.fn().mockResolvedValue({ data: resolveData, error: resolveError });
    builder.maybeSingle = vi.fn().mockResolvedValue({ data: resolveData, error: resolveError });

    builder.then = (resolve: (val: { data: unknown; error: unknown }) => void) => {
      resolve({ data: resolveData, error: resolveError });
    };

    return builder;
  };

  // Profiles builder
  const profilesBuilder = createChainBuilder(profile, profileError);

  // Import sessions builder
  const sessionsBuilder = createChainBuilder(session, sessionError);
  const sessionInsertBuilder: Record<string, Mock> = {};
  sessionInsertBuilder.select = vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({
      data: insertResult ?? {
        id: 'session-123',
        company_id: 'company-123',
        user_id: 'test-user-id',
        format: 'employees',
        status: 'pending',
        file_name: 'test.csv',
        file_size: 1000,
        total_rows: null,
        valid_rows: null,
        error_rows: null,
        parsed_data: null,
        validation_errors: [],
        result: null,
        created_at: new Date().toISOString(),
        completed_at: null,
      },
      error: insertError,
    }),
  });
  (sessionsBuilder as Record<string, Mock>).insert = vi.fn(() => sessionInsertBuilder);

  // Entitlements builder
  const entitlementsBuilder = createChainBuilder({ can_bulk_import: canBulkImport }, null);

  // Column mappings builder
  const mappingsBuilder = createChainBuilder([], null);

  // From router
  const from = vi.fn((table: string) => {
    switch (table) {
      case 'profiles':
        return profilesBuilder;
      case 'import_sessions':
        return sessionsBuilder;
      case 'company_entitlements':
        return entitlementsBuilder;
      case 'column_mappings':
        return mappingsBuilder;
      default:
        return createChainBuilder(null, null);
    }
  });

  return {
    from,
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    sessionsBuilder,
    profilesBuilder,
  };
}

// ============================================================================
// Module Mocks
// ============================================================================

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/security/tenant-access', () => ({
  requireCompanyAccess: vi.fn().mockResolvedValue({
    userId: 'test-user-id',
    companyId: 'company-123',
    role: 'user',
  }),
  requireCompanyAccessCached: vi.fn().mockResolvedValue({
    userId: 'test-user-id',
    companyId: 'company-123',
    role: 'user',
  }),
}));

vi.mock('@/lib/security/mfa', () => ({
  enforceMfaForPrivilegedUser: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkServerActionRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// ============================================================================
// Test Suite
// ============================================================================

describe('Import API / Server Actions', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset environment
    process.env.NODE_ENV = 'development';

    // Reset rate limit mock to allow by default
    const { checkServerActionRateLimit } = await import('@/lib/rate-limit');
    vi.mocked(checkServerActionRateLimit).mockResolvedValue({ allowed: true });

    // Reset tenant-access mock to succeed by default
    const { requireCompanyAccessCached } = await import('@/lib/security/tenant-access');
    vi.mocked(requireCompanyAccessCached).mockResolvedValue({
      userId: 'test-user-id',
      companyId: 'company-123',
      role: 'user',
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // createImportSession Tests
  // ============================================================================
  describe('createImportSession', () => {
    it('creates session with valid file and format', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createServerActionMock({
        profile: { company_id: 'company-123', role: 'user' },
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { createImportSession } = await import('@/app/(dashboard)/import/actions');

      const file = createMockFile('test.csv', 1000, 'text/csv');
      const formData = createImportFormData(file, 'employees');

      const result = await createImportSession(formData);

      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session?.format).toBe('employees');
    });

    it('returns error for unauthenticated request', async () => {
      const { requireCompanyAccessCached } = await import('@/lib/security/tenant-access');
      vi.mocked(requireCompanyAccessCached).mockRejectedValue(new Error('Not authenticated'));

      const { createImportSession } = await import('@/app/(dashboard)/import/actions');

      const file = createMockFile('test.csv', 1000, 'text/csv');
      const formData = createImportFormData(file, 'employees');

      const result = await createImportSession(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error for missing file', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createServerActionMock({});
      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { createImportSession } = await import('@/app/(dashboard)/import/actions');

      const formData = new FormData();
      formData.set('format', 'employees');
      // No file

      const result = await createImportSession(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No file provided');
    });

    it('returns error for invalid format', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createServerActionMock({});
      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { createImportSession } = await import('@/app/(dashboard)/import/actions');

      const file = createMockFile('test.csv', 1000, 'text/csv');
      const formData = new FormData();
      formData.set('file', file);
      formData.set('format', 'invalid');

      const result = await createImportSession(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid import format');
    });

    it('returns error for file exceeding size limit', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createServerActionMock({});
      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { createImportSession } = await import('@/app/(dashboard)/import/actions');

      // 11MB file (exceeds 10MB limit)
      const file = createMockFile('large.csv', 11 * 1024 * 1024, 'text/csv');
      const formData = createImportFormData(file, 'employees');

      const result = await createImportSession(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('returns error for empty file', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createServerActionMock({});
      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { createImportSession } = await import('@/app/(dashboard)/import/actions');

      const file = createMockFile('empty.csv', 0, 'text/csv');
      const formData = createImportFormData(file, 'employees');

      const result = await createImportSession(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('returns error for invalid file type', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createServerActionMock({});
      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { createImportSession } = await import('@/app/(dashboard)/import/actions');

      // PDF file - not allowed
      const file = createMockFile('test.pdf', 1000, 'application/pdf');
      const formData = createImportFormData(file, 'employees');

      const result = await createImportSession(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('returns error for macro-enabled Excel files', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createServerActionMock({});
      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { createImportSession } = await import('@/app/(dashboard)/import/actions');

      // .xlsm file - macro-enabled, not allowed for security
      // Note: Since .xlsm MIME type is not in the allowed list and .xlsm extension is not allowed,
      // it fails the MIME type check first with "Invalid file type" before reaching the macro check.
      // This is correct behavior - we still reject the file.
      const file = createMockFile('test.xlsm', 1000, 'application/vnd.ms-excel.sheet.macroEnabled.12');
      const formData = createImportFormData(file, 'employees');

      const result = await createImportSession(formData);

      expect(result.success).toBe(false);
      // The file is rejected - it fails either MIME type or extension validation
      expect(result.error).toContain('Invalid file type');
    });

    it('returns error when user profile not found', async () => {
      const { requireCompanyAccessCached } = await import('@/lib/security/tenant-access');
      vi.mocked(requireCompanyAccessCached).mockRejectedValue(new Error('Profile not found'));

      const { createImportSession } = await import('@/app/(dashboard)/import/actions');

      const file = createMockFile('test.csv', 1000, 'text/csv');
      const formData = createImportFormData(file, 'employees');

      const result = await createImportSession(formData);

      expect(result.success).toBe(false);
      // The code catches all requireCompanyAccessCached errors as 'Not authenticated'
      expect(result.error).toBe('Not authenticated');
    });

    it('enforces rate limiting', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkServerActionRateLimit } = await import('@/lib/rate-limit');

      const mockClient = createServerActionMock({});
      vi.mocked(createClient).mockResolvedValue(mockClient as never);
      vi.mocked(checkServerActionRateLimit).mockResolvedValue({
        allowed: false,
        error: 'Too many requests. Please try again later.',
      });

      const { createImportSession } = await import('@/app/(dashboard)/import/actions');

      const file = createMockFile('test.csv', 1000, 'text/csv');
      const formData = createImportFormData(file, 'employees');

      const result = await createImportSession(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many requests');
    });
  });

  // ============================================================================
  // getImportSession Tests
  // ============================================================================
  describe('getImportSession', () => {
    it('returns session when found', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const sessionData = {
        id: 'session-123',
        company_id: 'company-123',
        user_id: 'test-user-id',
        format: 'employees',
        status: 'ready',
        file_name: 'test.csv',
        file_size: 1000,
        total_rows: 10,
        valid_rows: 10,
        error_rows: 0,
        parsed_data: [],
        validation_errors: [],
        result: null,
        created_at: new Date().toISOString(),
        completed_at: null,
      };

      const mockClient = createServerActionMock({
        session: sessionData,
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { getImportSession } = await import('@/app/(dashboard)/import/actions');

      const result = await getImportSession('session-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('session-123');
      expect(result?.format).toBe('employees');
    });

    it('returns null when session not found', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createServerActionMock({
        session: null,
        sessionError: { message: 'Not found' },
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { getImportSession } = await import('@/app/(dashboard)/import/actions');

      const result = await getImportSession('non-existent');

      expect(result).toBeNull();
    });

    it('returns null when profile not found (defense-in-depth)', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockClient = createServerActionMock({
        profile: null,
        profileError: { message: 'Profile not found' },
      });

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { getImportSession } = await import('@/app/(dashboard)/import/actions');

      const result = await getImportSession('session-123');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // updateSessionStatus Tests
  // ============================================================================
  describe('updateSessionStatus', () => {
    it('updates status successfully', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const sessionData = {
        company_id: 'company-123',
      };

      // Create mock with proper update chain
      const updateBuilder: Record<string, Mock> = {};
      updateBuilder.eq = vi.fn().mockResolvedValue({ error: null });

      const sessionsBuilder: Record<string, Mock> = {};
      sessionsBuilder.select = vi.fn().mockReturnValue(sessionsBuilder);
      sessionsBuilder.eq = vi.fn().mockReturnValue(sessionsBuilder);
      sessionsBuilder.single = vi.fn().mockResolvedValue({ data: sessionData, error: null });
      sessionsBuilder.update = vi.fn(() => updateBuilder);

      const profilesBuilder: Record<string, Mock> = {};
      profilesBuilder.select = vi.fn().mockReturnValue(profilesBuilder);
      profilesBuilder.single = vi.fn().mockResolvedValue({
        data: { company_id: 'company-123' },
        error: null,
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'import_sessions') return sessionsBuilder;
          if (table === 'profiles') return profilesBuilder;
          return {};
        }),
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id' } },
            error: null,
          }),
        },
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { updateSessionStatus } = await import('@/app/(dashboard)/import/actions');

      const result = await updateSessionStatus('session-123', 'validating');

      expect(result).toBe(true);
    });

    it('returns false when session not found', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const sessionsBuilder: Record<string, Mock> = {};
      sessionsBuilder.select = vi.fn().mockReturnValue(sessionsBuilder);
      sessionsBuilder.eq = vi.fn().mockReturnValue(sessionsBuilder);
      sessionsBuilder.single = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const mockClient = {
        from: vi.fn().mockReturnValue(sessionsBuilder),
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id' } },
            error: null,
          }),
        },
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { updateSessionStatus } = await import('@/app/(dashboard)/import/actions');

      const result = await updateSessionStatus('non-existent', 'validating');

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // executeImport Tests
  // ============================================================================
  describe('executeImport', () => {
    it('returns error when not authenticated', async () => {
      const { requireCompanyAccessCached } = await import('@/lib/security/tenant-access');

      vi.mocked(requireCompanyAccessCached).mockRejectedValueOnce(new Error('Unauthorized'));

      const { executeImport } = await import('@/app/(dashboard)/import/actions');

      const result = await executeImport('session-123');

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message === 'Not authenticated')).toBe(true);
    });

    it('enforces rate limiting', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkServerActionRateLimit } = await import('@/lib/rate-limit');

      const mockClient = createServerActionMock({});
      vi.mocked(createClient).mockResolvedValue(mockClient as never);
      vi.mocked(checkServerActionRateLimit).mockResolvedValue({
        allowed: false,
        error: 'Rate limit exceeded',
      });

      const { executeImport } = await import('@/app/(dashboard)/import/actions');

      const result = await executeImport('session-123');

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('Rate limit'))).toBe(true);
    });

    it('returns error when session not found', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      // Create comprehensive mock for the executeImport flow
      const sessionsBuilder: Record<string, Mock> = {};
      sessionsBuilder.select = vi.fn().mockReturnValue(sessionsBuilder);
      sessionsBuilder.eq = vi.fn().mockReturnValue(sessionsBuilder);
      sessionsBuilder.single = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const profilesBuilder: Record<string, Mock> = {};
      profilesBuilder.select = vi.fn().mockReturnValue(profilesBuilder);
      profilesBuilder.eq = vi.fn().mockReturnValue(profilesBuilder);
      profilesBuilder.single = vi.fn().mockResolvedValue({
        data: { role: 'user' },
        error: null,
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'profiles') return profilesBuilder;
          if (table === 'import_sessions') return sessionsBuilder;
          return sessionsBuilder;
        }),
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id' } },
            error: null,
          }),
        },
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { executeImport } = await import('@/app/(dashboard)/import/actions');

      const result = await executeImport('non-existent');

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('session') || e.message.includes('missing'))).toBe(true);
    });

    it('returns error when session has no parsed data', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const sessionData = {
        company_id: 'company-123',
        format: 'employees',
        parsed_data: null,
      };

      // Create a more comprehensive mock for this test
      const sessionsBuilder: Record<string, Mock> = {};
      sessionsBuilder.select = vi.fn().mockReturnValue(sessionsBuilder);
      sessionsBuilder.eq = vi.fn().mockReturnValue(sessionsBuilder);
      sessionsBuilder.single = vi.fn().mockResolvedValue({ data: sessionData, error: null });
      sessionsBuilder.update = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const profilesBuilder: Record<string, Mock> = {};
      profilesBuilder.select = vi.fn().mockReturnValue(profilesBuilder);
      profilesBuilder.eq = vi.fn().mockReturnValue(profilesBuilder);
      profilesBuilder.single = vi.fn().mockResolvedValue({
        data: { company_id: 'company-123', role: 'user' },
        error: null,
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'import_sessions') return sessionsBuilder;
          if (table === 'profiles') return profilesBuilder;
          return sessionsBuilder;
        }),
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id' } },
            error: null,
          }),
        },
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { executeImport } = await import('@/app/(dashboard)/import/actions');

      const result = await executeImport('session-123');

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('missing') || e.message.includes('session'))).toBe(true);
    });
  });

  // ============================================================================
  // deleteImportSession Tests
  // ============================================================================
  describe('deleteImportSession', () => {
    it('deletes session successfully', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const sessionData = {
        company_id: 'company-123',
      };

      // Create mock with proper delete chain
      const deleteBuilder: Record<string, Mock> = {};
      deleteBuilder.eq = vi.fn().mockResolvedValue({ error: null });

      const sessionsBuilder: Record<string, Mock> = {};
      sessionsBuilder.select = vi.fn().mockReturnValue(sessionsBuilder);
      sessionsBuilder.eq = vi.fn().mockReturnValue(sessionsBuilder);
      sessionsBuilder.single = vi.fn().mockResolvedValue({ data: sessionData, error: null });
      sessionsBuilder.delete = vi.fn(() => deleteBuilder);

      const mockClient = {
        from: vi.fn().mockReturnValue(sessionsBuilder),
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id' } },
            error: null,
          }),
        },
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { deleteImportSession } = await import('@/app/(dashboard)/import/actions');

      const result = await deleteImportSession('session-123');

      expect(result).toBe(true);
    });

    it('returns false when session not found', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const sessionsBuilder: Record<string, Mock> = {};
      sessionsBuilder.select = vi.fn().mockReturnValue(sessionsBuilder);
      sessionsBuilder.eq = vi.fn().mockReturnValue(sessionsBuilder);
      sessionsBuilder.single = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const mockClient = {
        from: vi.fn().mockReturnValue(sessionsBuilder),
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id' } },
            error: null,
          }),
        },
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as never);

      const { deleteImportSession } = await import('@/app/(dashboard)/import/actions');

      const result = await deleteImportSession('non-existent');

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // Column Mapping Actions Tests
  // ============================================================================
  describe('Column Mapping Actions', () => {
    describe('loadSavedMappings', () => {
      it('returns empty array when not authenticated', async () => {
        const { createClient } = await import('@/lib/supabase/server');

        const mockClient = createServerActionMock({
          user: null,
          authError: { message: 'Not authenticated' },
        });

        vi.mocked(createClient).mockResolvedValue(mockClient as never);

        const { loadSavedMappings } = await import('@/app/(dashboard)/import/actions');

        const result = await loadSavedMappings();

        expect(result).toEqual([]);
      });

      it('returns mappings for current company', async () => {
        const { createClient } = await import('@/lib/supabase/server');

        const mappings = [
          {
            id: 'mapping-1',
            company_id: 'company-123',
            created_by: 'test-user-id',
            name: 'Test Mapping',
            description: null,
            format: 'employees',
            mappings: { name: 'first_name' },
            times_used: 5,
            last_used_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];

        // Create mock with proper mappings response - supports chained .order().order()
        const mappingsBuilder: Record<string, Mock> = {};
        mappingsBuilder.select = vi.fn().mockReturnValue(mappingsBuilder);
        mappingsBuilder.eq = vi.fn().mockReturnValue(mappingsBuilder);
        // First order() returns the builder, second order() returns the final promise
        mappingsBuilder.order = vi.fn()
          .mockReturnValueOnce(mappingsBuilder)
          .mockResolvedValueOnce({ data: mappings, error: null });

        const mockClient = {
          from: vi.fn((table: string) => {
            if (table === 'column_mappings') return mappingsBuilder;
            // Return a basic mock for other tables
            const basicBuilder: Record<string, Mock> = {};
            basicBuilder.select = vi.fn().mockReturnValue(basicBuilder);
            basicBuilder.eq = vi.fn().mockReturnValue(basicBuilder);
            basicBuilder.single = vi.fn().mockResolvedValue({ data: null, error: null });
            return basicBuilder;
          }),
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'test-user-id' } },
              error: null,
            }),
          },
        };

        vi.mocked(createClient).mockResolvedValue(mockClient as never);

        const { loadSavedMappings } = await import('@/app/(dashboard)/import/actions');

        const result = await loadSavedMappings();

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Test Mapping');
      });
    });

    describe('saveColumnMapping', () => {
      it('returns null when not authenticated', async () => {
        const { requireCompanyAccessCached } = await import('@/lib/security/tenant-access');

        vi.mocked(requireCompanyAccessCached).mockRejectedValueOnce(new Error('Unauthorized'));

        const { saveColumnMapping } = await import('@/app/(dashboard)/import/actions');

        const result = await saveColumnMapping(
          'Test Mapping',
          'employees',
          { name: 'first_name' }
        );

        expect(result).toBeNull();
      });

      it('validates mapping name length', async () => {
        const { createClient } = await import('@/lib/supabase/server');

        const mockClient = createServerActionMock({});
        vi.mocked(createClient).mockResolvedValue(mockClient as never);

        const { saveColumnMapping } = await import('@/app/(dashboard)/import/actions');

        // Empty name should fail validation
        const result = await saveColumnMapping(
          '',
          'employees',
          { name: 'first_name' }
        );

        expect(result).toBeNull();
      });
    });

    describe('deleteColumnMapping', () => {
      it('returns false when mapping not found', async () => {
        const { createClient } = await import('@/lib/supabase/server');

        const mappingsBuilder: Record<string, Mock> = {};
        mappingsBuilder.select = vi.fn().mockReturnValue(mappingsBuilder);
        mappingsBuilder.eq = vi.fn().mockReturnValue(mappingsBuilder);
        mappingsBuilder.single = vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        });

        const mockClient = {
          from: vi.fn().mockReturnValue(mappingsBuilder),
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'test-user-id' } },
              error: null,
            }),
          },
        };

        vi.mocked(createClient).mockResolvedValue(mockClient as never);

        const { deleteColumnMapping } = await import('@/app/(dashboard)/import/actions');

        const result = await deleteColumnMapping('non-existent');

        expect(result).toBe(false);
      });
    });
  });

  // ============================================================================
  // Pagination Tests
  // ============================================================================
  describe('Pagination', () => {
    describe('getImportSessionsPaginated', () => {
      it('returns paginated results', async () => {
        const { createClient } = await import('@/lib/supabase/server');

        const sessions = Array.from({ length: 5 }, (_, i) => ({
          id: `session-${i}`,
          company_id: 'company-123',
          user_id: 'test-user-id',
          format: 'employees',
          status: 'completed',
          file_name: `file-${i}.csv`,
          file_size: 1000,
          total_rows: 10,
          valid_rows: 10,
          error_rows: 0,
          parsed_data: [],
          validation_errors: [],
          result: null,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }));

        // Create mock with count and range support
        const sessionsBuilder: Record<string, Mock> = {};
        sessionsBuilder.select = vi.fn().mockReturnValue(sessionsBuilder);
        sessionsBuilder.eq = vi.fn().mockReturnValue(sessionsBuilder);
        sessionsBuilder.in = vi.fn().mockReturnValue(sessionsBuilder);
        sessionsBuilder.order = vi.fn().mockReturnValue(sessionsBuilder);
        sessionsBuilder.range = vi.fn().mockResolvedValue({ data: sessions, error: null });

        // Count query mock
        const countBuilder: Record<string, Mock> = {};
        countBuilder.select = vi.fn().mockReturnValue(countBuilder);
        countBuilder.eq = vi.fn().mockReturnValue(countBuilder);
        countBuilder.in = vi.fn().mockResolvedValue({ count: 25, error: null });

        let callCount = 0;
        const mockClient = {
          from: vi.fn(() => {
            callCount++;
            // First call is for count, second is for data
            if (callCount === 1) return countBuilder;
            return sessionsBuilder;
          }),
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'test-user-id' } },
              error: null,
            }),
          },
        };

        vi.mocked(createClient).mockResolvedValue(mockClient as never);

        const { getImportSessionsPaginated } = await import('@/app/(dashboard)/import/actions');

        const result = await getImportSessionsPaginated(1, 5);

        expect(result.sessions).toHaveLength(5);
        expect(result.total).toBe(25);
        expect(result.page).toBe(1);
        expect(result.perPage).toBe(5);
        expect(result.totalPages).toBe(5);
      });
    });
  });
});
