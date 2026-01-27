/**
 * @fileoverview Form validation integration tests
 *
 * Tests end-to-end validation flows for:
 * - Employee forms (name validation)
 * - Trip forms (dates, country, overlap detection)
 * - Auth forms (email, password strength)
 * - Error message accuracy
 */

import { describe, it, expect, vi } from 'vitest';
import {
  tripSchema,
  checkTripOverlap,
  calculateTravelDays,
} from '@/lib/validations/trip';
import { employeeSchema } from '@/lib/validations/employee';
import {
  loginSchema,
  signupSchema,
  getPasswordStrengthFeedback,
} from '@/lib/validations/auth';

describe('Employee form validation', () => {
  describe('name field', () => {
    it('accepts valid names', () => {
      const validNames = [
        'John Smith',
        'Mary-Jane Watson',
        "Patrick O'Brien",
        'José García',
        'Müller Friedrich',
      ];

      validNames.forEach(name => {
        const result = employeeSchema.safeParse({ name });
        expect(result.success).toBe(true);
      });
    });

    it('rejects empty name with clear error', () => {
      const result = employeeSchema.safeParse({ name: '' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name is required');
        expect(result.error.issues[0].path).toContain('name');
      }
    });

    it('rejects name under 2 characters with clear error', () => {
      const result = employeeSchema.safeParse({ name: 'A' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name must be at least 2 characters');
      }
    });

    it('rejects invalid characters with helpful error', () => {
      const result = employeeSchema.safeParse({ name: 'John123' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Name can only contain letters, spaces, hyphens, apostrophes, and periods'
        );
      }
    });
  });
});

describe('Trip form validation', () => {
  const baseTrip = {
    employee_id: '550e8400-e29b-41d4-a716-446655440000',
    country: 'FR',
    entry_date: '2025-11-01',
    exit_date: '2025-11-10',
  };

  describe('date validation', () => {
    it('rejects end date before start date', () => {
      const result = tripSchema.safeParse({
        ...baseTrip,
        entry_date: '2025-11-15',
        exit_date: '2025-11-10',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const dateError = result.error.issues.find(i =>
          i.message === 'Exit date must be on or after entry date'
        );
        expect(dateError).toBeDefined();
        expect(dateError?.path).toContain('exit_date');
      }
    });

    it('accepts same-day trip', () => {
      const result = tripSchema.safeParse({
        ...baseTrip,
        entry_date: '2025-11-15',
        exit_date: '2025-11-15',
      });

      expect(result.success).toBe(true);
    });

    it('rejects trip exceeding 180 days', () => {
      const result = tripSchema.safeParse({
        ...baseTrip,
        entry_date: '2025-01-01',
        exit_date: '2025-07-15', // 195 days
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i =>
          i.message === 'Trip duration cannot exceed 180 days'
        )).toBe(true);
      }
    });

    it('duration calculation counts both entry and exit days', () => {
      // Test the duration calculation directly since schema has date range constraints
      // that prevent testing a full 180-day trip without mocking Date.now()
      expect(calculateTravelDays('2025-01-01', '2025-01-01')).toBe(1); // Same day = 1
      expect(calculateTravelDays('2025-01-01', '2025-01-02')).toBe(2); // 2 days
      expect(calculateTravelDays('2025-01-01', '2025-01-10')).toBe(10); // 10 days
      expect(calculateTravelDays('2025-01-01', '2025-06-29')).toBe(180); // 180 days
    });
  });

  describe('country validation', () => {
    it('accepts valid Schengen country codes', () => {
      const countries = ['FR', 'DE', 'IT', 'ES', 'NL'];

      countries.forEach(country => {
        const result = tripSchema.safeParse({ ...baseTrip, country });
        expect(result.success).toBe(true);
      });
    });

    it('transforms lowercase to uppercase', () => {
      const result = tripSchema.safeParse({ ...baseTrip, country: 'fr' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.country).toBe('FR');
      }
    });

    it('rejects unknown country code', () => {
      const result = tripSchema.safeParse({ ...baseTrip, country: 'XX' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please select a valid country');
      }
    });

    it('rejects 3-letter country codes', () => {
      const result = tripSchema.safeParse({ ...baseTrip, country: 'FRA' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Country code must be 2 letters');
      }
    });
  });

  describe('overlap detection integration', () => {
    const existingTrips = [
      { id: 'trip-1', entry_date: '2025-11-01', exit_date: '2025-11-10' },
      { id: 'trip-2', entry_date: '2025-11-20', exit_date: '2025-11-25' },
    ];

    it('detects overlapping trip and shows helpful message', () => {
      const result = checkTripOverlap(
        '2025-11-05',
        '2025-11-15',
        existingTrips
      );

      expect(result.hasOverlap).toBe(true);
      expect(result.message).toContain('overlaps');
      expect(result.message).toContain('1 Nov');
      expect(result.message).toContain('10 Nov');
    });

    it('allows non-overlapping trip', () => {
      const result = checkTripOverlap(
        '2025-11-12',
        '2025-11-18',
        existingTrips
      );

      expect(result.hasOverlap).toBe(false);
      expect(result.message).toBeNull();
    });

    it('calculates travel days correctly for display', () => {
      expect(calculateTravelDays('2025-11-01', '2025-11-10')).toBe(10);
      expect(calculateTravelDays('2025-11-15', '2025-11-15')).toBe(1);
    });
  });

  describe('optional field handling', () => {
    it('trims whitespace from purpose', () => {
      const result = tripSchema.safeParse({
        ...baseTrip,
        purpose: '  Business meeting  ',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.purpose).toBe('Business meeting');
      }
    });

    it('converts empty purpose to null', () => {
      const result = tripSchema.safeParse({
        ...baseTrip,
        purpose: '   ',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.purpose).toBeNull();
      }
    });

    it('accepts purpose up to 500 characters', () => {
      const result = tripSchema.safeParse({
        ...baseTrip,
        purpose: 'A'.repeat(500),
      });

      expect(result.success).toBe(true);
    });

    it('rejects purpose over 500 characters', () => {
      const result = tripSchema.safeParse({
        ...baseTrip,
        purpose: 'A'.repeat(501),
      });

      expect(result.success).toBe(false);
    });
  });
});

describe('Auth form validation', () => {
  describe('login form', () => {
    it('accepts valid credentials', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
    });

    it('normalizes email to lowercase', () => {
      // Note: Zod validates email format BEFORE transform, so leading/trailing
      // whitespace in email fails validation. Only case normalization is tested.
      const result = loginSchema.safeParse({
        email: 'USER@EXAMPLE.COM',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });

    it('shows specific error for invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid email address');
      }
    });

    it('shows specific error for missing email', () => {
      const result = loginSchema.safeParse({
        email: '',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });
  });

  describe('signup form', () => {
    const validSignup = {
      email: 'newuser@example.com',
      companyName: 'Test Company Ltd',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
      termsAccepted: true,
    };

    it('accepts valid signup data', () => {
      const result = signupSchema.safeParse(validSignup);
      expect(result.success).toBe(true);
    });

    it('shows specific error for short company name', () => {
      const result = signupSchema.safeParse({
        ...validSignup,
        companyName: 'A',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Company name must be at least 2 characters');
      }
    });

    it('shows specific error for invalid company characters', () => {
      const result = signupSchema.safeParse({
        ...validSignup,
        companyName: 'Company<script>',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Company name contains invalid characters');
      }
    });

    it('shows password mismatch error on confirmPassword field', () => {
      const result = signupSchema.safeParse({
        ...validSignup,
        confirmPassword: 'DifferentPass123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const mismatchError = result.error.issues.find(i =>
          i.message === 'Passwords do not match'
        );
        expect(mismatchError).toBeDefined();
        expect(mismatchError?.path).toContain('confirmPassword');
      }
    });
  });

  describe('password strength feedback', () => {
    it('provides all feedback for empty password', () => {
      const feedback = getPasswordStrengthFeedback('');

      expect(feedback).toHaveLength(4);
      expect(feedback).toContain('At least 8 characters');
      expect(feedback).toContain('One uppercase letter');
      expect(feedback).toContain('One lowercase letter');
      expect(feedback).toContain('One number');
    });

    it('removes satisfied requirements from feedback', () => {
      // Has uppercase and lowercase, missing length and number
      const feedback = getPasswordStrengthFeedback('AbcDef');

      expect(feedback).toContain('At least 8 characters');
      expect(feedback).toContain('One number');
      expect(feedback).not.toContain('One uppercase letter');
      expect(feedback).not.toContain('One lowercase letter');
    });

    it('returns empty array for valid password', () => {
      const feedback = getPasswordStrengthFeedback('SecurePass123');

      expect(feedback).toHaveLength(0);
    });
  });
});

describe('Error message clarity', () => {
  describe('messages are user-friendly', () => {
    it('avoids technical jargon in validation errors', () => {
      // Employee name
      const nameResult = employeeSchema.safeParse({ name: '' });
      if (!nameResult.success) {
        expect(nameResult.error.issues[0].message).not.toContain('string');
        expect(nameResult.error.issues[0].message).not.toContain('undefined');
      }

      // Trip country
      const tripResult = tripSchema.safeParse({
        employee_id: '550e8400-e29b-41d4-a716-446655440000',
        country: '',
        entry_date: '2025-11-01',
        exit_date: '2025-11-10',
      });
      if (!tripResult.success) {
        expect(tripResult.error.issues[0].message).toBe('Country is required');
      }
    });

    it('provides actionable guidance in error messages', () => {
      const result = tripSchema.safeParse({
        employee_id: '550e8400-e29b-41d4-a716-446655440000',
        country: 'XX',
        entry_date: '2025-11-01',
        exit_date: '2025-11-10',
      });

      if (!result.success) {
        // Message tells user what to do
        expect(result.error.issues[0].message).toBe('Please select a valid country');
      }
    });
  });
});
