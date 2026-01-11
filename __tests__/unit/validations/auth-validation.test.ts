/**
 * @fileoverview Authentication validation schema tests
 *
 * Tests all auth-related Zod schemas:
 * - loginSchema
 * - signupSchema
 * - forgotPasswordSchema
 * - resetPasswordSchema
 */

import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  getPasswordStrengthFeedback,
} from '@/lib/validations/auth';

describe('loginSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
    });

    it('normalizes email to lowercase', () => {
      const result = loginSchema.safeParse({
        email: 'User@Example.COM',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });
  });

  describe('email validation', () => {
    it('rejects empty email', () => {
      const result = loginSchema.safeParse({
        email: '',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('rejects invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid email address');
      }
    });

    it('rejects email over 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@b.co';
      const result = loginSchema.safeParse({
        email: longEmail,
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('password validation', () => {
    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });
  });
});

describe('signupSchema', () => {
  const validSignup = {
    email: 'newuser@example.com',
    companyName: 'Test Company Ltd',
    password: 'SecurePass123',
    confirmPassword: 'SecurePass123',
  };

  describe('valid inputs', () => {
    it('accepts valid signup data', () => {
      const result = signupSchema.safeParse(validSignup);

      expect(result.success).toBe(true);
    });

    it('accepts company names with special characters', () => {
      const result = signupSchema.safeParse({
        ...validSignup,
        companyName: "O'Brien & Partners (UK)",
      });

      expect(result.success).toBe(true);
    });
  });

  describe('email validation', () => {
    it('rejects invalid email format', () => {
      const result = signupSchema.safeParse({
        ...validSignup,
        email: 'invalid-email',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('company name validation', () => {
    it('rejects empty company name', () => {
      const result = signupSchema.safeParse({
        ...validSignup,
        companyName: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Company name is required');
      }
    });

    it('rejects company name under 2 characters', () => {
      const result = signupSchema.safeParse({
        ...validSignup,
        companyName: 'A',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Company name must be at least 2 characters');
      }
    });

    it('rejects company name over 100 characters', () => {
      const result = signupSchema.safeParse({
        ...validSignup,
        companyName: 'A'.repeat(101),
      });

      expect(result.success).toBe(false);
    });

    it('rejects company name with invalid characters', () => {
      const result = signupSchema.safeParse({
        ...validSignup,
        companyName: 'Company <script>',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Company name contains invalid characters');
      }
    });
  });

  describe('password validation', () => {
    it('rejects password under 8 characters', () => {
      const result = signupSchema.safeParse({
        ...validSignup,
        password: 'Short1',
        confirmPassword: 'Short1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message.includes('8 characters'))).toBe(true);
      }
    });

    it('rejects password without uppercase letter', () => {
      const result = signupSchema.safeParse({
        ...validSignup,
        password: 'lowercase123',
        confirmPassword: 'lowercase123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message.includes('uppercase'))).toBe(true);
      }
    });

    it('rejects password without lowercase letter', () => {
      const result = signupSchema.safeParse({
        ...validSignup,
        password: 'UPPERCASE123',
        confirmPassword: 'UPPERCASE123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message.includes('lowercase'))).toBe(true);
      }
    });

    it('rejects password without number', () => {
      const result = signupSchema.safeParse({
        ...validSignup,
        password: 'NoNumbersHere',
        confirmPassword: 'NoNumbersHere',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message.includes('number'))).toBe(true);
      }
    });

    it('rejects mismatched passwords', () => {
      const result = signupSchema.safeParse({
        ...validSignup,
        password: 'SecurePass123',
        confirmPassword: 'DifferentPass123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message === 'Passwords do not match')).toBe(true);
      }
    });
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'user@example.com',
    });

    expect(result.success).toBe(true);
  });

  it('normalizes email to lowercase', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'USER@EXAMPLE.COM',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'not-valid',
    });

    expect(result.success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts valid password reset', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'NewSecure123',
      confirmPassword: 'NewSecure123',
    });

    expect(result.success).toBe(true);
  });

  it('rejects weak password', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'weak',
      confirmPassword: 'weak',
    });

    expect(result.success).toBe(false);
  });

  it('rejects mismatched passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'NewSecure123',
      confirmPassword: 'Different123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message === 'Passwords do not match')).toBe(true);
    }
  });
});

describe('getPasswordStrengthFeedback', () => {
  it('returns all requirements for empty password', () => {
    const feedback = getPasswordStrengthFeedback('');

    expect(feedback).toContain('At least 8 characters');
    expect(feedback).toContain('One uppercase letter');
    expect(feedback).toContain('One lowercase letter');
    expect(feedback).toContain('One number');
  });

  it('returns empty array for valid password', () => {
    const feedback = getPasswordStrengthFeedback('SecurePass123');

    expect(feedback).toHaveLength(0);
  });

  it('identifies missing uppercase', () => {
    const feedback = getPasswordStrengthFeedback('lowercase123');

    expect(feedback).toContain('One uppercase letter');
    expect(feedback).not.toContain('One lowercase letter');
    expect(feedback).not.toContain('One number');
  });

  it('identifies missing lowercase', () => {
    const feedback = getPasswordStrengthFeedback('UPPERCASE123');

    expect(feedback).toContain('One lowercase letter');
    expect(feedback).not.toContain('One uppercase letter');
  });

  it('identifies missing number', () => {
    const feedback = getPasswordStrengthFeedback('NoNumbersHere');

    expect(feedback).toContain('One number');
    expect(feedback).not.toContain('One uppercase letter');
    expect(feedback).not.toContain('One lowercase letter');
  });

  it('identifies short password', () => {
    const feedback = getPasswordStrengthFeedback('Ab1');

    expect(feedback).toContain('At least 8 characters');
  });
});
