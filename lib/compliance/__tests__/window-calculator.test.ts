/**
 * @fileoverview Tests for rolling 180-day window calculations.
 */

import { describe, it, expect } from 'vitest';
import {
  isInWindow,
  daysUsedInWindow,
  calculateDaysRemaining,
  isCompliant,
  canSafelyEnter,
  getWindowBounds,
} from '../window-calculator';
import { InvalidReferenceDateError } from '../errors';
import { subDays, differenceInDays } from 'date-fns';

// Helper to create presence set from date strings
function createPresence(dateStrings: string[]): Set<string> {
  return new Set(dateStrings);
}

// Helper to generate consecutive dates (UTC-safe)
function generateDates(start: string, count: number): string[] {
  const dates: string[] = [];
  const startDate = new Date(start + 'T00:00:00.000Z');
  for (let i = 0; i < count; i++) {
    const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// Use an early compliance start date for tests (to not interfere with calculations)
const EARLY_COMPLIANCE_START = new Date('2024-01-01');

describe('isInWindow', () => {
  describe('window boundary definitions', () => {
    // Reference date: 2025-07-01
    // Window should be: [2025-01-02 (inclusive), 2025-06-30 (inclusive)]
    // That's exactly 180 days

    it('includes day exactly 180 days ago', () => {
      const refDate = new Date('2025-07-01');
      const dayAtBoundary = new Date('2025-01-02'); // 180 days before July 1

      expect(isInWindow(dayAtBoundary, refDate)).toBe(true);
    });

    it('excludes day 181 days ago', () => {
      const refDate = new Date('2025-07-01');
      const dayOutside = new Date('2025-01-01'); // 181 days before July 1

      expect(isInWindow(dayOutside, refDate)).toBe(false);
    });

    it('includes yesterday (day before reference)', () => {
      const refDate = new Date('2025-07-01');
      const yesterday = new Date('2025-06-30');

      expect(isInWindow(yesterday, refDate)).toBe(true);
    });

    it('excludes the reference date itself', () => {
      const refDate = new Date('2025-07-01');

      expect(isInWindow(refDate, refDate)).toBe(false);
    });

    it('window contains exactly 180 days', () => {
      const refDate = new Date('2025-07-01');
      const windowStart = subDays(refDate, 180);
      const windowEnd = subDays(refDate, 1);

      // Count days inclusive
      const windowSize = differenceInDays(windowEnd, windowStart) + 1;

      expect(windowSize).toBe(180);
    });
  });

  describe('various dates', () => {
    it('includes dates in middle of window', () => {
      const refDate = new Date('2025-07-01');

      expect(isInWindow(new Date('2025-03-15'), refDate)).toBe(true);
      expect(isInWindow(new Date('2025-05-01'), refDate)).toBe(true);
      expect(isInWindow(new Date('2025-06-15'), refDate)).toBe(true);
    });

    it('excludes future dates', () => {
      const refDate = new Date('2025-07-01');

      expect(isInWindow(new Date('2025-07-02'), refDate)).toBe(false);
      expect(isInWindow(new Date('2025-08-01'), refDate)).toBe(false);
    });

    it('excludes very old dates', () => {
      const refDate = new Date('2025-07-01');

      expect(isInWindow(new Date('2024-01-01'), refDate)).toBe(false);
      expect(isInWindow(new Date('2020-01-01'), refDate)).toBe(false);
    });
  });
});

describe('daysUsedInWindow', () => {
  describe('basic counting', () => {
    it('counts all presence days in window', () => {
      const presence = createPresence([
        '2025-06-01',
        '2025-06-02',
        '2025-06-03',
      ]);
      const refDate = new Date('2025-07-01');

      const used = daysUsedInWindow(presence, refDate, { complianceStartDate: EARLY_COMPLIANCE_START });

      expect(used).toBe(3);
    });

    it('returns 0 for empty presence set', () => {
      const presence = createPresence([]);
      const refDate = new Date('2025-07-01');

      const used = daysUsedInWindow(presence, refDate, { complianceStartDate: EARLY_COMPLIANCE_START });

      expect(used).toBe(0);
    });

    it('excludes days outside window', () => {
      const presence = createPresence([
        '2025-01-01', // 181 days before July 1 - outside window
        '2025-06-30', // yesterday - inside window
        '2025-07-01', // reference date - outside window
      ]);
      const refDate = new Date('2025-07-01');

      const used = daysUsedInWindow(presence, refDate, { complianceStartDate: EARLY_COMPLIANCE_START });

      expect(used).toBe(1); // Only June 30 counts
    });
  });

  describe('compliance start date handling', () => {
    it('does not count days before compliance start', () => {
      const presence = createPresence([
        '2025-10-01', // Before compliance start
        '2025-10-05', // Before compliance start
        '2025-10-12', // On compliance start
        '2025-10-15', // After compliance start
      ]);
      const refDate = new Date('2025-11-01');
      const config = { complianceStartDate: new Date('2025-10-12') };

      const used = daysUsedInWindow(presence, refDate, config);

      expect(used).toBe(2); // Only Oct 12 and Oct 15
    });

    it('returns 0 if window end is before compliance start', () => {
      const presence = createPresence(['2025-09-01', '2025-09-15']);
      const refDate = new Date('2025-10-01');
      const config = { complianceStartDate: new Date('2025-10-12') };

      const used = daysUsedInWindow(presence, refDate, config);

      expect(used).toBe(0);
    });
  });

  describe('input validation', () => {
    it('throws InvalidReferenceDateError for invalid date', () => {
      const presence = createPresence(['2025-06-01']);

      expect(() =>
        daysUsedInWindow(presence, new Date('invalid'))
      ).toThrow(InvalidReferenceDateError);
    });

    it('throws InvalidReferenceDateError for null', () => {
      const presence = createPresence(['2025-06-01']);

      expect(() =>
        daysUsedInWindow(presence, null as unknown as Date)
      ).toThrow(InvalidReferenceDateError);
    });
  });
});

describe('calculateDaysRemaining', () => {
  it('calculates remaining as 90 minus used', () => {
    const presence = createPresence(
      Array.from({ length: 45 }, (_, i) => `2025-06-${String(i + 1).padStart(2, '0')}`)
        .filter(d => d <= '2025-06-30') // Cap at June 30
    );
    const refDate = new Date('2025-07-01');

    const remaining = calculateDaysRemaining(presence, refDate, { complianceStartDate: EARLY_COMPLIANCE_START });

    expect(remaining).toBe(60); // 90 - 30 (days in June)
  });

  it('returns 90 for no presence days', () => {
    const presence = createPresence([]);
    const refDate = new Date('2025-07-01');

    const remaining = calculateDaysRemaining(presence, refDate, { complianceStartDate: EARLY_COMPLIANCE_START });

    expect(remaining).toBe(90);
  });

  it('returns 0 when exactly at limit', () => {
    // Create exactly 90 days within the window
    const simpleDates: string[] = [];
    const start = new Date('2025-04-01');
    for (let i = 0; i < 90; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      simpleDates.push(d.toISOString().split('T')[0]);
    }

    const presence = createPresence(simpleDates);
    const refDate = new Date('2025-07-01');

    const remaining = calculateDaysRemaining(presence, refDate, { complianceStartDate: EARLY_COMPLIANCE_START });

    expect(remaining).toBe(0);
  });

  it('returns negative when over limit', () => {
    // Create 95 unique days - starting from April 1 (after DST, within 180-day window of July 1)
    // Window for July 1 is [Jan 2, Jun 30]
    // April 1 + 94 days = July 3, but only days before July 1 count
    // So we use May 1 as start to ensure all 95 days fit: May 1 + 94 = Aug 3, but window ends Jun 30
    // Actually, let's use generateDates helper which properly handles dates
    const dates = generateDates('2025-01-05', 95); // All within window, no DST issues

    const presence = createPresence(dates);
    const refDate = new Date('2025-07-01');

    const remaining = calculateDaysRemaining(presence, refDate, { complianceStartDate: EARLY_COMPLIANCE_START });

    expect(remaining).toBe(-5); // 90 - 95 = -5
  });

  it('respects custom limit', () => {
    const presence = createPresence(['2025-06-01', '2025-06-02', '2025-06-03']);
    const refDate = new Date('2025-07-01');

    const remaining = calculateDaysRemaining(presence, refDate, { limit: 10, complianceStartDate: EARLY_COMPLIANCE_START });

    expect(remaining).toBe(7); // 10 - 3 = 7
  });
});

describe('isCompliant', () => {
  it('returns true when under limit', () => {
    const presence = createPresence(['2025-06-01', '2025-06-02']);
    const refDate = new Date('2025-07-01');

    expect(isCompliant(presence, refDate, { complianceStartDate: EARLY_COMPLIANCE_START })).toBe(true);
  });

  it('returns false when exactly at limit (90 days = violation)', () => {
    // 90 days = violation (max compliant is 89)
    const dates: string[] = [];
    const start = new Date('2025-04-01');
    for (let i = 0; i < 90; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const presence = createPresence(dates);
    const refDate = new Date('2025-07-01');

    expect(isCompliant(presence, refDate, { complianceStartDate: EARLY_COMPLIANCE_START })).toBe(false);
  });

  it('returns false when over limit', () => {
    // 91 days
    const dates: string[] = [];
    const start = new Date('2025-03-31');
    for (let i = 0; i < 91; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const presence = createPresence(dates);
    const refDate = new Date('2025-07-01');

    expect(isCompliant(presence, refDate, { complianceStartDate: EARLY_COMPLIANCE_START })).toBe(false);
  });
});

describe('canSafelyEnter', () => {
  it('returns true when well under limit', () => {
    const presence = createPresence(['2025-06-01', '2025-06-02']);
    const refDate = new Date('2025-07-01');

    expect(canSafelyEnter(presence, refDate, { complianceStartDate: EARLY_COMPLIANCE_START })).toBe(true);
  });

  it('returns true when at 89 days (can stay 1 more day)', () => {
    const dates: string[] = [];
    const start = new Date('2025-04-02');
    for (let i = 0; i < 89; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const presence = createPresence(dates);
    const refDate = new Date('2025-07-01');

    expect(canSafelyEnter(presence, refDate, { complianceStartDate: EARLY_COMPLIANCE_START })).toBe(true);
  });

  it('returns false when at 90 days (no room for entry day)', () => {
    const dates: string[] = [];
    const start = new Date('2025-04-01');
    for (let i = 0; i < 90; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const presence = createPresence(dates);
    const refDate = new Date('2025-07-01');

    expect(canSafelyEnter(presence, refDate, { complianceStartDate: EARLY_COMPLIANCE_START })).toBe(false);
  });

  it('returns false when over limit', () => {
    const dates: string[] = [];
    const start = new Date('2025-03-31');
    for (let i = 0; i < 95; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const presence = createPresence(dates);
    const refDate = new Date('2025-07-01');

    expect(canSafelyEnter(presence, refDate, { complianceStartDate: EARLY_COMPLIANCE_START })).toBe(false);
  });
});

describe('getWindowBounds', () => {
  it('returns correct window boundaries', () => {
    const refDate = new Date('2025-07-01');
    const bounds = getWindowBounds(refDate, { complianceStartDate: EARLY_COMPLIANCE_START });

    expect(bounds.windowStart.toISOString()).toContain('2025-01-02');
    expect(bounds.windowEnd.toISOString()).toContain('2025-06-30');
  });

  it('respects compliance start date', () => {
    const refDate = new Date('2025-11-01');
    const bounds = getWindowBounds(refDate, {
      complianceStartDate: new Date('2025-10-12'),
    });

    // Window start would be May 5, but compliance starts Oct 12
    expect(bounds.windowStart.toISOString()).toContain('2025-10-12');
    expect(bounds.windowEnd.toISOString()).toContain('2025-10-31');
  });
});
