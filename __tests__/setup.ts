/**
 * @fileoverview Global test setup for Vitest
 *
 * This file runs before each test file and sets up:
 * - jest-dom matchers for DOM assertions
 * - Global mocks for Next.js and Supabase
 * - Test environment configuration
 */

import { expect, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

// Mock Next.js headers (for server components)
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
  }),
  headers: () => new Headers(),
}));

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
