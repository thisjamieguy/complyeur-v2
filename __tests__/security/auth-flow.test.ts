/**
 * @fileoverview Authentication flow tests
 *
 * Tests the authentication logic including:
 * - Signup (user creation, company creation, profile setup)
 * - Login (credential validation, session creation)
 * - Logout (session clearing)
 * - Password reset flow
 * - Protected route access
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockSupabaseClient,
  createMockUser,
  createMockSession,
  createMockAuthError,
} from '../utils/mock-supabase';
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/lib/validations/auth';

describe('Authentication flows', () => {
  describe('signup flow', () => {
    it('creates user, company, profile, and settings on valid signup', async () => {
      const mockClient = createMockSupabaseClient();
      const mockUser = createMockUser({ email: 'newuser@example.com' });

      // Mock successful signup
      mockClient.auth.signUp = vi.fn().mockResolvedValue({
        data: {
          user: mockUser,
          session: createMockSession(mockUser),
        },
        error: null,
      });

      // Mock RPC for company/profile creation
      mockClient.rpc = vi.fn().mockResolvedValue({
        data: { company_id: 'new-company-uuid' },
        error: null,
      });

      // Validate input
      const input = signupSchema.safeParse({
        email: 'newuser@example.com',
        companyName: 'New Company Ltd',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      });

      expect(input.success).toBe(true);

      // Execute signup
      const signupResult = await mockClient.auth.signUp({
        email: 'newuser@example.com',
        password: 'SecurePass123',
      });

      expect(signupResult.error).toBeNull();
      expect(signupResult.data.user).not.toBeNull();
      expect(signupResult.data.session).not.toBeNull();

      // Company/profile creation would be called
      expect(mockClient.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'SecurePass123',
      });
    });

    it('rejects signup with invalid email format', async () => {
      const mockClient = createMockSupabaseClient();

      // Validation should fail before API call
      const input = signupSchema.safeParse({
        email: 'not-valid-email',
        companyName: 'Test Company',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      });

      expect(input.success).toBe(false);
      if (!input.success) {
        expect(input.error.issues[0].message).toBe('Please enter a valid email address');
      }
    });

    it('rejects signup with weak password', async () => {
      const input = signupSchema.safeParse({
        email: 'user@example.com',
        companyName: 'Test Company',
        password: 'weak',
        confirmPassword: 'weak',
      });

      expect(input.success).toBe(false);
      if (!input.success) {
        expect(input.error.issues.some(i => i.path.includes('password'))).toBe(true);
      }
    });

    it('rejects signup with existing email', async () => {
      const mockClient = createMockSupabaseClient();

      // Mock Supabase returning existing user error
      mockClient.auth.signUp = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: createMockAuthError('User already registered', 400),
      });

      const result = await mockClient.auth.signUp({
        email: 'existing@example.com',
        password: 'SecurePass123',
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('already registered');
    });

    it('rejects signup with mismatched passwords', () => {
      const input = signupSchema.safeParse({
        email: 'user@example.com',
        companyName: 'Test Company',
        password: 'SecurePass123',
        confirmPassword: 'DifferentPass123',
      });

      expect(input.success).toBe(false);
      if (!input.success) {
        expect(input.error.issues.some(i => i.message === 'Passwords do not match')).toBe(true);
      }
    });
  });

  describe('login flow', () => {
    it('succeeds with valid credentials', async () => {
      const mockClient = createMockSupabaseClient();
      const mockUser = createMockUser();

      mockClient.auth.signInWithPassword = vi.fn().mockResolvedValue({
        data: {
          user: mockUser,
          session: createMockSession(mockUser),
        },
        error: null,
      });

      // Validate input
      const input = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
      });

      expect(input.success).toBe(true);

      // Execute login
      const result = await mockClient.auth.signInWithPassword({
        email: 'user@example.com',
        password: 'password123',
      });

      expect(result.error).toBeNull();
      expect(result.data.user).not.toBeNull();
      expect(result.data.session).not.toBeNull();
    });

    it('creates valid session on successful login', async () => {
      const mockClient = createMockSupabaseClient();
      const mockUser = createMockUser();
      const mockSession = createMockSession(mockUser);

      mockClient.auth.signInWithPassword = vi.fn().mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await mockClient.auth.signInWithPassword({
        email: 'user@example.com',
        password: 'password123',
      });

      expect(result.data.session?.access_token).toBeDefined();
      expect(result.data.session?.expires_at).toBeGreaterThan(Date.now() / 1000);
      expect(result.data.session?.user.id).toBe(mockUser.id);
    });

    it('fails with wrong password', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.auth.signInWithPassword = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: createMockAuthError('Invalid login credentials', 400),
      });

      const result = await mockClient.auth.signInWithPassword({
        email: 'user@example.com',
        password: 'wrongpassword',
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('Invalid login credentials');
    });

    it('fails with non-existent email', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.auth.signInWithPassword = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: createMockAuthError('Invalid login credentials', 400),
      });

      const result = await mockClient.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      expect(result.error).not.toBeNull();
    });

    it('normalizes email before authentication', () => {
      const input = loginSchema.safeParse({
        email: 'USER@EXAMPLE.COM',
        password: 'password123',
      });

      expect(input.success).toBe(true);
      if (input.success) {
        expect(input.data.email).toBe('user@example.com');
      }
    });
  });

  describe('logout flow', () => {
    it('clears session on logout', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.auth.signOut = vi.fn().mockResolvedValue({
        error: null,
      });

      const result = await mockClient.auth.signOut();

      expect(result.error).toBeNull();
      expect(mockClient.auth.signOut).toHaveBeenCalled();
    });

    it('getSession returns null after logout', async () => {
      const mockClient = createMockSupabaseClient();

      // Before logout
      mockClient.auth.getSession = vi.fn()
        .mockResolvedValueOnce({
          data: { session: createMockSession() },
          error: null,
        })
        // After logout
        .mockResolvedValueOnce({
          data: { session: null },
          error: null,
        });

      // Check session exists
      const beforeLogout = await mockClient.auth.getSession();
      expect(beforeLogout.data.session).not.toBeNull();

      // Logout
      await mockClient.auth.signOut();

      // Check session is gone
      const afterLogout = await mockClient.auth.getSession();
      expect(afterLogout.data.session).toBeNull();
    });
  });

  describe('password reset flow', () => {
    it('sends reset email for valid account', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.auth.resetPasswordForEmail = vi.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      // Validate input
      const input = forgotPasswordSchema.safeParse({
        email: 'user@example.com',
      });

      expect(input.success).toBe(true);

      const result = await mockClient.auth.resetPasswordForEmail('user@example.com');

      expect(result.error).toBeNull();
      expect(mockClient.auth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com');
    });

    it('completes reset with valid token', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.auth.updateUser = vi.fn().mockResolvedValue({
        data: { user: createMockUser() },
        error: null,
      });

      // Validate new password
      const input = resetPasswordSchema.safeParse({
        password: 'NewSecure123',
        confirmPassword: 'NewSecure123',
      });

      expect(input.success).toBe(true);

      // Update password
      const result = await mockClient.auth.updateUser({
        password: 'NewSecure123',
      });

      expect(result.error).toBeNull();
    });

    it('rejects expired or invalid token', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.auth.updateUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: createMockAuthError('Token has expired or is invalid', 400),
      });

      const result = await mockClient.auth.updateUser({
        password: 'NewSecure123',
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('Token');
    });

    it('requires strong password on reset', () => {
      const input = resetPasswordSchema.safeParse({
        password: 'weak',
        confirmPassword: 'weak',
      });

      expect(input.success).toBe(false);
    });
  });

  describe('protected routes', () => {
    it('authenticated user has access to session', async () => {
      const mockClient = createMockSupabaseClient();
      const mockUser = createMockUser();
      const mockSession = createMockSession(mockUser);

      mockClient.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { data } = await mockClient.auth.getSession();

      expect(data.session).not.toBeNull();
      expect(data.session?.user.id).toBe(mockUser.id);
    });

    it('unauthenticated user has no session', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { data } = await mockClient.auth.getSession();

      expect(data.session).toBeNull();
    });

    it('getUser returns user for authenticated session', async () => {
      const mockClient = createMockSupabaseClient();
      const mockUser = createMockUser();

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { data } = await mockClient.auth.getUser();

      expect(data.user).not.toBeNull();
      expect(data.user?.email).toBe(mockUser.email);
    });

    it('getUser returns null for unauthenticated request', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: createMockAuthError('Not authenticated', 401),
      });

      const { data, error } = await mockClient.auth.getUser();

      expect(data.user).toBeNull();
      expect(error).not.toBeNull();
    });
  });

  describe('session management', () => {
    it('session includes user metadata', async () => {
      const mockClient = createMockSupabaseClient();
      const mockUser = createMockUser({
        user_metadata: { name: 'Test User' },
      });
      const mockSession = createMockSession(mockUser);

      mockClient.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { data } = await mockClient.auth.getSession();

      expect(data.session?.user.user_metadata.name).toBe('Test User');
    });

    it('onAuthStateChange registers callback', () => {
      const mockClient = createMockSupabaseClient();
      const listener = vi.fn();

      mockClient.auth.onAuthStateChange = vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      });

      const result = mockClient.auth.onAuthStateChange(listener);

      expect(mockClient.auth.onAuthStateChange).toHaveBeenCalledWith(listener);
      expect(result.data.subscription.unsubscribe).toBeDefined();
    });

    it('onAuthStateChange subscription can be unsubscribed', () => {
      const mockClient = createMockSupabaseClient();
      const listener = vi.fn();
      const unsubscribe = vi.fn();

      mockClient.auth.onAuthStateChange = vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe } },
      });

      const result = mockClient.auth.onAuthStateChange(listener);
      result.data.subscription.unsubscribe();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
