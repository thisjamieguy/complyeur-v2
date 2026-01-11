/**
 * @fileoverview Trip validation schema tests
 *
 * Tests:
 * - tripSchema validation
 * - tripUpdateSchema validation
 * - Trip overlap detection
 * - Date boundary validation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  tripSchema,
  tripUpdateSchema,
  checkTripOverlap,
  calculateTravelDays,
  type Trip,
} from '@/lib/validations/trip';

// Helper to create valid trip data
function createValidTripData() {
  return {
    employee_id: '550e8400-e29b-41d4-a716-446655440000',
    country: 'FR',
    entry_date: '2025-11-01',
    exit_date: '2025-11-10',
    purpose: 'Business meeting',
    job_ref: 'JOB-001',
    is_private: false,
    ghosted: false,
  };
}

describe('tripSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid trip data', () => {
      const result = tripSchema.safeParse(createValidTripData());

      expect(result.success).toBe(true);
    });

    it('accepts trip without optional fields', () => {
      const result = tripSchema.safeParse({
        employee_id: '550e8400-e29b-41d4-a716-446655440000',
        country: 'DE',
        entry_date: '2025-11-01',
        exit_date: '2025-11-10',
      });

      expect(result.success).toBe(true);
    });

    it('transforms country code to uppercase', () => {
      const result = tripSchema.safeParse({
        ...createValidTripData(),
        country: 'fr',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.country).toBe('FR');
      }
    });

    it('accepts same-day trip', () => {
      const result = tripSchema.safeParse({
        ...createValidTripData(),
        entry_date: '2025-11-15',
        exit_date: '2025-11-15',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('employee_id validation', () => {
    it('rejects invalid UUID format', () => {
      const result = tripSchema.safeParse({
        ...createValidTripData(),
        employee_id: 'not-a-uuid',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('country validation', () => {
    it('rejects empty country', () => {
      const result = tripSchema.safeParse({
        ...createValidTripData(),
        country: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Country is required');
      }
    });

    it('rejects country code not exactly 2 characters', () => {
      const result = tripSchema.safeParse({
        ...createValidTripData(),
        country: 'FRA',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Country code must be 2 letters');
      }
    });

    it('rejects unknown country code', () => {
      const result = tripSchema.safeParse({
        ...createValidTripData(),
        country: 'XX',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please select a valid country');
      }
    });
  });

  describe('date validation', () => {
    it('rejects empty entry date', () => {
      const result = tripSchema.safeParse({
        ...createValidTripData(),
        entry_date: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('entry_date'))).toBe(true);
      }
    });

    it('rejects invalid date format', () => {
      const result = tripSchema.safeParse({
        ...createValidTripData(),
        entry_date: '15/11/2025', // DD/MM/YYYY format
      });

      expect(result.success).toBe(false);
    });

    it('rejects exit date before entry date', () => {
      const result = tripSchema.safeParse({
        ...createValidTripData(),
        entry_date: '2025-11-15',
        exit_date: '2025-11-10',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i =>
          i.message === 'Exit date must be on or after entry date'
        )).toBe(true);
      }
    });

    it('rejects trip duration over 180 days', () => {
      const result = tripSchema.safeParse({
        ...createValidTripData(),
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
  });

  describe('optional field validation', () => {
    it('rejects purpose over 500 characters', () => {
      const result = tripSchema.safeParse({
        ...createValidTripData(),
        purpose: 'A'.repeat(501),
      });

      expect(result.success).toBe(false);
    });

    it('rejects job_ref over 100 characters', () => {
      const result = tripSchema.safeParse({
        ...createValidTripData(),
        job_ref: 'A'.repeat(101),
      });

      expect(result.success).toBe(false);
    });

    it('trims whitespace from purpose', () => {
      const result = tripSchema.safeParse({
        ...createValidTripData(),
        purpose: '  Business meeting  ',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.purpose).toBe('Business meeting');
      }
    });

    it('converts empty purpose to null', () => {
      const result = tripSchema.safeParse({
        ...createValidTripData(),
        purpose: '   ',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.purpose).toBeNull();
      }
    });
  });
});

describe('tripUpdateSchema', () => {
  it('accepts partial update with valid country', () => {
    const result = tripUpdateSchema.safeParse({
      country: 'DE',
    });

    expect(result.success).toBe(true);
  });

  it('accepts empty object (no updates)', () => {
    const result = tripUpdateSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it('validates date range when both dates provided', () => {
    const result = tripUpdateSchema.safeParse({
      entry_date: '2025-11-15',
      exit_date: '2025-11-10', // Before entry
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i =>
        i.message === 'Exit date must be on or after entry date'
      )).toBe(true);
    }
  });

  it('allows single date update without validation', () => {
    // When only one date is provided, we can't validate the range
    const result = tripUpdateSchema.safeParse({
      entry_date: '2025-11-15',
    });

    expect(result.success).toBe(true);
  });
});

describe('checkTripOverlap', () => {
  const existingTrips: Trip[] = [
    { id: 'trip-1', entry_date: '2025-11-01', exit_date: '2025-11-10' },
    { id: 'trip-2', entry_date: '2025-11-20', exit_date: '2025-11-25' },
    { id: 'trip-3', entry_date: '2025-12-01', exit_date: '2025-12-15' },
  ];

  describe('overlap detection', () => {
    it('detects overlap when new trip starts during existing trip', () => {
      const result = checkTripOverlap(
        '2025-11-05', // Starts during trip-1
        '2025-11-15',
        existingTrips
      );

      expect(result.hasOverlap).toBe(true);
      expect(result.overlappingTrip?.id).toBe('trip-1');
      expect(result.message).toContain('overlaps');
    });

    it('detects overlap when new trip ends during existing trip', () => {
      const result = checkTripOverlap(
        '2025-10-25',
        '2025-11-05', // Ends during trip-1
        existingTrips
      );

      expect(result.hasOverlap).toBe(true);
      expect(result.overlappingTrip?.id).toBe('trip-1');
    });

    it('detects overlap when new trip completely contains existing trip', () => {
      const result = checkTripOverlap(
        '2025-10-25',
        '2025-11-15', // Contains trip-1 entirely
        existingTrips
      );

      expect(result.hasOverlap).toBe(true);
    });

    it('detects overlap when new trip is completely within existing trip', () => {
      const result = checkTripOverlap(
        '2025-11-03',
        '2025-11-07', // Within trip-1
        existingTrips
      );

      expect(result.hasOverlap).toBe(true);
    });

    it('detects same-day overlap', () => {
      const result = checkTripOverlap(
        '2025-11-10', // Same as trip-1 exit date
        '2025-11-12',
        existingTrips
      );

      expect(result.hasOverlap).toBe(true);
    });
  });

  describe('no overlap cases', () => {
    it('returns no overlap for trip in gap between existing trips', () => {
      const result = checkTripOverlap(
        '2025-11-12', // Between trip-1 and trip-2
        '2025-11-18',
        existingTrips
      );

      expect(result.hasOverlap).toBe(false);
      expect(result.overlappingTrip).toBeNull();
      expect(result.message).toBeNull();
    });

    it('returns no overlap for trip before all existing trips', () => {
      const result = checkTripOverlap(
        '2025-10-01',
        '2025-10-10',
        existingTrips
      );

      expect(result.hasOverlap).toBe(false);
    });

    it('returns no overlap for trip after all existing trips', () => {
      const result = checkTripOverlap(
        '2025-12-20',
        '2025-12-25',
        existingTrips
      );

      expect(result.hasOverlap).toBe(false);
    });

    it('returns no overlap when empty trips array', () => {
      const result = checkTripOverlap('2025-11-01', '2025-11-10', []);

      expect(result.hasOverlap).toBe(false);
    });
  });

  describe('excludeTripId', () => {
    it('excludes the specified trip from overlap check (for edit operations)', () => {
      // Editing trip-1, should not detect self-overlap
      const result = checkTripOverlap(
        '2025-11-01',
        '2025-11-10',
        existingTrips,
        'trip-1' // Exclude trip being edited
      );

      expect(result.hasOverlap).toBe(false);
    });

    it('still detects overlap with other trips when editing', () => {
      // Editing trip-1 but extending into trip-2's dates
      const result = checkTripOverlap(
        '2025-11-01',
        '2025-11-22', // Now overlaps trip-2
        existingTrips,
        'trip-1'
      );

      expect(result.hasOverlap).toBe(true);
      expect(result.overlappingTrip?.id).toBe('trip-2');
    });
  });
});

describe('calculateTravelDays', () => {
  it('calculates same-day trip as 1 day', () => {
    const days = calculateTravelDays('2025-11-15', '2025-11-15');
    expect(days).toBe(1);
  });

  it('calculates 2-day trip correctly', () => {
    const days = calculateTravelDays('2025-11-15', '2025-11-16');
    expect(days).toBe(2);
  });

  it('calculates 10-day trip correctly (inclusive)', () => {
    const days = calculateTravelDays('2025-11-01', '2025-11-10');
    expect(days).toBe(10);
  });

  it('handles month boundaries', () => {
    const days = calculateTravelDays('2025-10-28', '2025-11-02');
    // Oct 28, 29, 30, 31, Nov 1, 2 = 6 days
    expect(days).toBe(6);
  });

  it('handles year boundaries', () => {
    const days = calculateTravelDays('2025-12-30', '2026-01-02');
    // Dec 30, 31, Jan 1, 2 = 4 days
    expect(days).toBe(4);
  });

  it('handles leap year February', () => {
    // 2024 is a leap year
    const days = calculateTravelDays('2024-02-28', '2024-03-01');
    // Feb 28, 29, Mar 1 = 3 days
    expect(days).toBe(3);
  });

  it('handles non-leap year February', () => {
    // 2025 is not a leap year
    const days = calculateTravelDays('2025-02-28', '2025-03-01');
    // Feb 28, Mar 1 = 2 days (no Feb 29)
    expect(days).toBe(2);
  });
});
