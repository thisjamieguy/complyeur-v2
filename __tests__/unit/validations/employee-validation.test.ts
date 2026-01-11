/**
 * @fileoverview Employee validation schema tests
 *
 * Tests:
 * - employeeSchema validation
 * - employeeUpdateSchema validation
 * - Name field requirements
 */

import { describe, it, expect } from 'vitest';
import {
  employeeSchema,
  employeeUpdateSchema,
} from '@/lib/validations/employee';

describe('employeeSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid name', () => {
      const result = employeeSchema.safeParse({
        name: 'John Doe',
      });

      expect(result.success).toBe(true);
    });

    it('accepts name with hyphens', () => {
      const result = employeeSchema.safeParse({
        name: 'Mary-Jane Watson',
      });

      expect(result.success).toBe(true);
    });

    it('accepts name with apostrophes', () => {
      const result = employeeSchema.safeParse({
        name: "Patrick O'Brien",
      });

      expect(result.success).toBe(true);
    });

    it('accepts accented characters', () => {
      const result = employeeSchema.safeParse({
        name: 'José García',
      });

      expect(result.success).toBe(true);
    });

    it('accepts various international names', () => {
      const internationalNames = [
        'François Müller',
        'Søren Kierkegaard',
        'Björk Guðmundsdóttir',
        'Zoë Smith',
        'Naïve Doe',
      ];

      internationalNames.forEach(name => {
        const result = employeeSchema.safeParse({ name });
        expect(result.success).toBe(true);
      });
    });

    it('trims whitespace', () => {
      const result = employeeSchema.safeParse({
        name: '  John Doe  ',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John Doe');
      }
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty name', () => {
      const result = employeeSchema.safeParse({
        name: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name is required');
      }
    });

    it('rejects name under 2 characters', () => {
      const result = employeeSchema.safeParse({
        name: 'J',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name must be at least 2 characters');
      }
    });

    it('rejects name over 100 characters', () => {
      const result = employeeSchema.safeParse({
        name: 'A'.repeat(101),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name must be less than 100 characters');
      }
    });

    it('rejects name with numbers', () => {
      const result = employeeSchema.safeParse({
        name: 'John Doe 3rd',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Name can only contain letters, spaces, hyphens, and apostrophes'
        );
      }
    });

    it('rejects name with special characters', () => {
      const invalidNames = [
        'John@Doe',
        'John!Doe',
        'John#Doe',
        'John$Doe',
        'John<Doe>',
        'John(Doe)',
        'John_Doe',
      ];

      invalidNames.forEach(name => {
        const result = employeeSchema.safeParse({ name });
        expect(result.success).toBe(false);
      });
    });

    it('rejects whitespace-only input', () => {
      const result = employeeSchema.safeParse({
        name: '   ',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('accepts exactly 2 characters', () => {
      const result = employeeSchema.safeParse({
        name: 'Jo',
      });

      expect(result.success).toBe(true);
    });

    it('accepts exactly 100 characters', () => {
      const result = employeeSchema.safeParse({
        name: 'A'.repeat(100),
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('employeeUpdateSchema', () => {
  it('accepts valid name update', () => {
    const result = employeeUpdateSchema.safeParse({
      name: 'Jane Doe',
    });

    expect(result.success).toBe(true);
  });

  it('accepts empty object (no update)', () => {
    const result = employeeUpdateSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it('accepts undefined name', () => {
    const result = employeeUpdateSchema.safeParse({
      name: undefined,
    });

    expect(result.success).toBe(true);
  });

  it('validates name when provided', () => {
    const result = employeeUpdateSchema.safeParse({
      name: 'A', // Too short
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Name must be at least 2 characters');
    }
  });
});
