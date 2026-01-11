/**
 * @fileoverview Supabase client mocks for testing
 *
 * Provides mock implementations of Supabase client for unit tests.
 * These mocks isolate tests from the actual database.
 */

import { vi } from 'vitest';
import type { SupabaseClient, User, Session, AuthError } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Type-safe mock factory
type MockSupabaseClient = {
  auth: {
    getSession: ReturnType<typeof vi.fn>;
    getUser: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signUp: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    resetPasswordForEmail: ReturnType<typeof vi.fn>;
    updateUser: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
};

/**
 * Create a mock Supabase client for testing
 */
export function createMockSupabaseClient(overrides?: Partial<MockSupabaseClient>): MockSupabaseClient {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn(),
  };

  // Default mock resolves to empty data
  mockQueryBuilder.select.mockImplementation(() => {
    const builder = { ...mockQueryBuilder };
    (builder as { then: (resolve: (value: { data: null; error: null }) => void) => void }).then = (resolve) =>
      resolve({ data: null, error: null });
    return builder;
  });

  const defaultClient: MockSupabaseClient = {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({
        error: null,
      }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({
        data: {},
        error: null,
      }),
      updateUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue(mockQueryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return { ...defaultClient, ...overrides };
}

/**
 * Create a mock authenticated user
 */
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'test-user-id-12345',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'test@example.com',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {
      provider: 'email',
      providers: ['email'],
    },
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
    ...overrides,
  };
}

/**
 * Create a mock session
 */
export function createMockSession(user?: User): Session {
  const sessionUser = user ?? createMockUser();
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: sessionUser,
  };
}

/**
 * Create a mock auth error
 */
export function createMockAuthError(
  message: string,
  status: number = 400
): AuthError {
  return {
    name: 'AuthApiError',
    message,
    status,
    __isAuthError: true,
  } as AuthError;
}

/**
 * Mock company data
 */
export interface MockCompany {
  id: string;
  name: string;
  created_at: string;
}

export function createMockCompany(overrides?: Partial<MockCompany>): MockCompany {
  return {
    id: 'company-uuid-12345',
    name: 'Test Company Ltd',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock profile data
 */
export interface MockProfile {
  id: string;
  company_id: string;
  role: string;
  created_at: string;
}

export function createMockProfile(overrides?: Partial<MockProfile>): MockProfile {
  return {
    id: 'test-user-id-12345',
    company_id: 'company-uuid-12345',
    role: 'admin',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock employee data
 */
export interface MockEmployee {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
  is_deleted: boolean;
}

export function createMockEmployee(overrides?: Partial<MockEmployee>): MockEmployee {
  return {
    id: 'employee-uuid-12345',
    company_id: 'company-uuid-12345',
    name: 'John Doe',
    created_at: new Date().toISOString(),
    is_deleted: false,
    ...overrides,
  };
}

/**
 * Mock trip data
 */
export interface MockTrip {
  id: string;
  employee_id: string;
  country: string;
  entry_date: string;
  exit_date: string;
  purpose: string | null;
  job_ref: string | null;
  is_private: boolean;
  ghosted: boolean;
  created_at: string;
}

export function createMockTrip(overrides?: Partial<MockTrip>): MockTrip {
  return {
    id: 'trip-uuid-12345',
    employee_id: 'employee-uuid-12345',
    country: 'FR',
    entry_date: '2025-11-01',
    exit_date: '2025-11-10',
    purpose: 'Business meeting',
    job_ref: 'JOB-001',
    is_private: false,
    ghosted: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Setup mock for Supabase server client
 */
export function mockSupabaseServerClient(client: MockSupabaseClient) {
  vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn().mockResolvedValue(client),
  }));
}

/**
 * Setup mock for Supabase browser client
 */
export function mockSupabaseBrowserClient(client: MockSupabaseClient) {
  vi.mock('@/lib/supabase/client', () => ({
    createClient: vi.fn().mockReturnValue(client),
  }));
}
