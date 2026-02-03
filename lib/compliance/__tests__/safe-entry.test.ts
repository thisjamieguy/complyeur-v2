/**
 * @fileoverview Tests for safe entry date calculations.
 */

import { describe, it, expect } from 'vitest';
import {
  earliestSafeEntry,
  daysUntilCompliant,
  getSafeEntryInfo,
  maxStayDays,
  projectExpiringDays,
} from '../safe-entry';
import { InvalidReferenceDateError } from '../errors';
import { addDays } from 'date-fns';

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

describe('earliestSafeEntry', () => {
  describe('already eligible', () => {
    it('returns null when well under limit', () => {
      const presence = createPresence(['2025-06-01', '2025-06-02']);
      const today = new Date('2025-07-01');

      const result = earliestSafeEntry(presence, today, { complianceStartDate: EARLY_COMPLIANCE_START });

      expect(result).toBeNull();
    });

    it('returns null when at 89 days (can still enter)', () => {
      const dates = generateDates('2025-04-02', 89); // 89 days
      const presence = createPresence(dates);
      const today = new Date('2025-07-01');

      const result = earliestSafeEntry(presence, today, { complianceStartDate: EARLY_COMPLIANCE_START });

      expect(result).toBeNull();
    });

    it('returns null for empty presence', () => {
      const presence = createPresence([]);
      const today = new Date('2025-07-01');

      const result = earliestSafeEntry(presence, today, { complianceStartDate: EARLY_COMPLIANCE_START });

      expect(result).toBeNull();
    });
  });

  describe('waiting required', () => {
    it('returns correct date when at exactly 90 days', () => {
      // 90 days: Jan 2 - Apr 1 (within 180-day window for July 1)
      // Window for July 1 is [Jan 2, Jun 30]
      // For Jan 2 to fall out, we need window start > Jan 2
      // refDate - 180 > Jan 2 → refDate > July 1
      // On July 2: window is [Jan 3, Jul 1], Jan 2 falls out
      const dates = generateDates('2025-01-02', 90); // Jan 2 - Apr 1 (90 days)
      const presence = createPresence(dates);
      const today = new Date('2025-07-01');

      const result = earliestSafeEntry(presence, today, { complianceStartDate: EARLY_COMPLIANCE_START });

      expect(result).not.toBeNull();
      // Should be July 2 (when Jan 2 falls out of window)
      expect(result!.toISOString()).toContain('2025-07-02');
    });

    it('calculates correct wait time for over limit', () => {
      // 95 days starting Jan 2: Jan 2 - Apr 6
      // For 6 days to expire, we need window start > Jan 6
      // refDate - 180 > Jan 6 → refDate > July 5
      // On July 6: window is [Jan 7, Jul 5], Jan 2-6 fall out (5 days out, 90 remain)
      // Wait, we need 89 or fewer. So we need 6 days out → refDate > July 6
      // On July 7: window is [Jan 8, Jul 6], Jan 2-7 fall out (6 days out, 89 remain)
      const dates = generateDates('2025-01-02', 95); // Jan 2 - Apr 6 (95 days)
      const presence = createPresence(dates);
      const today = new Date('2025-07-01');

      const result = earliestSafeEntry(presence, today, { complianceStartDate: EARLY_COMPLIANCE_START });

      expect(result).not.toBeNull();
      // Need to wait for 6 days to expire (95 - 89 = 6)
      // Jan 2-7 expire by July 7
      expect(result!.toISOString()).toContain('2025-07-07');
    });

    it('finds date even with scattered presence', () => {
      // Create 90 scattered days within the 180-day window
      const dates: string[] = [];
      let d = new Date('2025-01-02'); // Start of window for July 1
      let count = 0;
      while (count < 90) {
        dates.push(d.toISOString().split('T')[0]);
        d = addDays(d, 2); // Every other day
        count++;
      }
      const presence = createPresence(dates);
      const today = new Date('2025-07-01');

      const result = earliestSafeEntry(presence, today, { complianceStartDate: EARLY_COMPLIANCE_START });

      expect(result).not.toBeNull();
      // Should find a date when one of the presence days expires
    });
  });

  describe('input validation', () => {
    it('throws InvalidReferenceDateError for invalid date', () => {
      const presence = createPresence(['2025-06-01']);

      expect(() =>
        earliestSafeEntry(presence, new Date('invalid'))
      ).toThrow(InvalidReferenceDateError);
    });

    it('throws InvalidReferenceDateError for null', () => {
      const presence = createPresence(['2025-06-01']);

      expect(() =>
        earliestSafeEntry(presence, null as unknown as Date)
      ).toThrow(InvalidReferenceDateError);
    });
  });
});

describe('daysUntilCompliant', () => {
  it('returns 0 when already compliant', () => {
    const presence = createPresence(['2025-06-01', '2025-06-02']);
    const today = new Date('2025-07-01');

    const result = daysUntilCompliant(presence, today, { complianceStartDate: EARLY_COMPLIANCE_START });

    expect(result).toBe(0);
  });

  it('returns 1 when one day away from compliance', () => {
    // 90 days: Jan 2 - Apr 1, at window boundary
    // Tomorrow (July 2) Jan 2 falls out → compliant
    const dates = generateDates('2025-01-02', 90);
    const presence = createPresence(dates);
    const today = new Date('2025-07-01');

    const result = daysUntilCompliant(presence, today, { complianceStartDate: EARLY_COMPLIANCE_START });

    expect(result).toBe(1); // Tomorrow is compliant
  });

  it('returns correct days for larger overage', () => {
    // 95 days: Jan 2 - Apr 6
    // Need 6 days to expire → compliant on July 7
    const dates = generateDates('2025-01-02', 95);
    const presence = createPresence(dates);
    const today = new Date('2025-07-01');

    const result = daysUntilCompliant(presence, today, { complianceStartDate: EARLY_COMPLIANCE_START });

    expect(result).toBe(6); // 6 days to wait for 6 days to expire
  });
});

describe('getSafeEntryInfo', () => {
  it('returns canEnterToday=true when under limit', () => {
    const presence = createPresence(['2025-06-01', '2025-06-02']);
    const today = new Date('2025-07-01');

    const result = getSafeEntryInfo(presence, today, { complianceStartDate: EARLY_COMPLIANCE_START });

    expect(result.canEnterToday).toBe(true);
    expect(result.earliestSafeDate).toBeNull();
    expect(result.daysUntilCompliant).toBe(0);
    expect(result.daysUsedOnEntry).toBe(2);
  });

  it('returns full info when waiting required', () => {
    // 95 days: Jan 2 - Apr 6, need 6 days to expire
    const dates = generateDates('2025-01-02', 95);
    const presence = createPresence(dates);
    const today = new Date('2025-07-01');

    const result = getSafeEntryInfo(presence, today, { complianceStartDate: EARLY_COMPLIANCE_START });

    expect(result.canEnterToday).toBe(false);
    expect(result.earliestSafeDate).not.toBeNull();
    expect(result.daysUntilCompliant).toBe(6);
    expect(result.daysUsedOnEntry).toBeLessThanOrEqual(89); // Will be 89 on safe date
  });

  it('throws InvalidReferenceDateError for invalid date', () => {
    const presence = createPresence(['2025-06-01']);

    expect(() =>
      getSafeEntryInfo(presence, new Date('invalid'))
    ).toThrow(InvalidReferenceDateError);
  });
});

describe('maxStayDays', () => {
  it('returns 90 for empty presence', () => {
    const presence = createPresence([]);
    const entryDate = new Date('2025-07-01');

    const result = maxStayDays(presence, entryDate, { complianceStartDate: EARLY_COMPLIANCE_START });

    expect(result).toBe(90);
  });

  it('returns remaining days based on window usage', () => {
    // 30 days used
    const dates = generateDates('2025-06-01', 30);
    const presence = createPresence(dates);
    const entryDate = new Date('2025-07-01');

    const result = maxStayDays(presence, entryDate, { complianceStartDate: EARLY_COMPLIANCE_START });

    expect(result).toBe(60); // 90 - 30 = 60
  });

  it('returns 0 when cannot enter', () => {
    // 90 days used - at limit, cannot safely enter
    const dates = generateDates('2025-04-01', 90);
    const presence = createPresence(dates);
    const entryDate = new Date('2025-07-01');

    const result = maxStayDays(presence, entryDate, { complianceStartDate: EARLY_COMPLIANCE_START });

    expect(result).toBe(0);
  });

  it('returns 1 when at 89 days', () => {
    const dates = generateDates('2025-04-02', 89);
    const presence = createPresence(dates);
    const entryDate = new Date('2025-07-01');

    const result = maxStayDays(presence, entryDate, { complianceStartDate: EARLY_COMPLIANCE_START });

    expect(result).toBe(1); // Can only stay entry day
  });

  describe('custom limit', () => {
    it('respects custom limit for max stay calculation', () => {
      // 30 days used, custom limit of 60
      const dates = generateDates('2025-06-01', 30);
      const presence = createPresence(dates);
      const entryDate = new Date('2025-07-01');

      const result = maxStayDays(presence, entryDate, {
        complianceStartDate: EARLY_COMPLIANCE_START,
        limit: 60,
      });

      expect(result).toBe(30); // 60 - 30 = 30
    });

    it('returns 0 when at custom limit', () => {
      // 60 days used, custom limit of 60
      const dates = generateDates('2025-05-01', 60);
      const presence = createPresence(dates);
      const entryDate = new Date('2025-07-01');

      const result = maxStayDays(presence, entryDate, {
        complianceStartDate: EARLY_COMPLIANCE_START,
        limit: 60,
      });

      expect(result).toBe(0);
    });
  });
});

describe('projectExpiringDays', () => {
  describe('basic projection', () => {
    it('returns correct projection for empty presence', () => {
      const presence = createPresence([]);
      const fromDate = new Date('2025-07-01');

      const result = projectExpiringDays(presence, fromDate, 3, {
        complianceStartDate: EARLY_COMPLIANCE_START,
      });

      expect(result).toHaveLength(4); // 0 through 3 days
      expect(result[0]).toMatchObject({
        expiringDays: 0, // Day 0 always has 0 expiring
        daysUsed: 0,
        daysRemaining: 90,
      });
      expect(result[1]).toMatchObject({
        expiringDays: 0, // Nothing to expire
        daysUsed: 0,
        daysRemaining: 90,
      });
    });

    it('returns correct dates in projection', () => {
      const presence = createPresence([]);
      const fromDate = new Date('2025-07-01');

      const result = projectExpiringDays(presence, fromDate, 2, {
        complianceStartDate: EARLY_COMPLIANCE_START,
      });

      expect(result[0].date.toISOString()).toContain('2025-07-01');
      expect(result[1].date.toISOString()).toContain('2025-07-02');
      expect(result[2].date.toISOString()).toContain('2025-07-03');
    });
  });

  describe('with presence days', () => {
    it('tracks expiring days as window moves', () => {
      // Create presence at the start of the window (180 days back)
      // For July 1: window is [Jan 2, Jun 30]
      // Jan 2 will expire on July 2 (window becomes [Jan 3, Jul 1])
      const dates = generateDates('2025-01-02', 5); // Jan 2-6
      const presence = createPresence(dates);
      const fromDate = new Date('2025-07-01');

      const result = projectExpiringDays(presence, fromDate, 5, {
        complianceStartDate: EARLY_COMPLIANCE_START,
      });

      // Day 0 (Jul 1): window [Jan 2, Jun 30], 5 days used
      expect(result[0].daysUsed).toBe(5);
      expect(result[0].expiringDays).toBe(0); // First day always 0

      // Day 1 (Jul 2): window [Jan 3, Jul 1], Jan 2 expires
      expect(result[1].daysUsed).toBe(4);
      expect(result[1].expiringDays).toBe(1);

      // Day 2 (Jul 3): window [Jan 4, Jul 2], Jan 3 expires
      expect(result[2].daysUsed).toBe(3);
      expect(result[2].expiringDays).toBe(1);
    });

    it('calculates correct days remaining', () => {
      const dates = generateDates('2025-06-01', 30);
      const presence = createPresence(dates);
      const fromDate = new Date('2025-07-01');

      const result = projectExpiringDays(presence, fromDate, 0, {
        complianceStartDate: EARLY_COMPLIANCE_START,
      });

      expect(result[0].daysUsed).toBe(30);
      expect(result[0].daysRemaining).toBe(60); // 90 - 30
    });

    it('handles non-consecutive presence days', () => {
      // Scattered days: Jan 2, Jan 4, Jan 6
      const presence = createPresence(['2025-01-02', '2025-01-04', '2025-01-06']);
      const fromDate = new Date('2025-07-01');

      const result = projectExpiringDays(presence, fromDate, 5, {
        complianceStartDate: EARLY_COMPLIANCE_START,
      });

      // Jul 1: window [Jan 2, Jun 30], all 3 days in window
      expect(result[0].daysUsed).toBe(3);

      // Jul 2: window [Jan 3, Jul 1], Jan 2 expires (but Jan 3 not present)
      expect(result[1].daysUsed).toBe(2);
      expect(result[1].expiringDays).toBe(1);

      // Jul 3: window [Jan 4, Jul 2], Jan 3 not present, nothing expires
      expect(result[2].daysUsed).toBe(2);
      expect(result[2].expiringDays).toBe(0);

      // Jul 4: window [Jan 5, Jul 3], Jan 4 expires
      expect(result[3].daysUsed).toBe(1);
      expect(result[3].expiringDays).toBe(1);
    });
  });

  describe('custom limit', () => {
    it('respects custom limit for days remaining', () => {
      const dates = generateDates('2025-06-01', 30);
      const presence = createPresence(dates);
      const fromDate = new Date('2025-07-01');

      const result = projectExpiringDays(presence, fromDate, 0, {
        complianceStartDate: EARLY_COMPLIANCE_START,
        limit: 60,
      });

      expect(result[0].daysRemaining).toBe(30); // 60 - 30
    });
  });

  describe('edge cases', () => {
    it('handles zero projection days', () => {
      const presence = createPresence([]);
      const fromDate = new Date('2025-07-01');

      const result = projectExpiringDays(presence, fromDate, 0, {
        complianceStartDate: EARLY_COMPLIANCE_START,
      });

      expect(result).toHaveLength(1);
      expect(result[0].expiringDays).toBe(0);
    });

    it('handles large projection range', () => {
      const presence = createPresence(['2025-01-02']);
      const fromDate = new Date('2025-07-01');

      // Project for 200 days (past window size)
      const result = projectExpiringDays(presence, fromDate, 200, {
        complianceStartDate: EARLY_COMPLIANCE_START,
      });

      expect(result).toHaveLength(201);
      // Eventually the presence day expires
      const totalExpired = result.reduce((sum, r) => sum + r.expiringDays, 0);
      expect(totalExpired).toBe(1); // Only 1 day to expire
    });

    it('handles presence that already expired', () => {
      // Presence from a year ago - already outside any window
      const presence = createPresence(['2024-01-01']);
      const fromDate = new Date('2025-07-01');

      const result = projectExpiringDays(presence, fromDate, 5, {
        complianceStartDate: EARLY_COMPLIANCE_START,
      });

      expect(result[0].daysUsed).toBe(0);
      expect(result[0].expiringDays).toBe(0);
    });
  });
});

describe('earliestSafeEntry - additional edge cases', () => {
  describe('custom limit', () => {
    it('returns null when under custom limit', () => {
      const dates = generateDates('2025-06-01', 30);
      const presence = createPresence(dates);
      const today = new Date('2025-07-01');

      const result = earliestSafeEntry(presence, today, {
        complianceStartDate: EARLY_COMPLIANCE_START,
        limit: 60,
      });

      // 30 days used, limit is 60, can enter with 59 days
      expect(result).toBeNull();
    });

    it('returns date when at custom limit', () => {
      // 60 days used, custom limit 60
      const dates = generateDates('2025-05-01', 60);
      const presence = createPresence(dates);
      const today = new Date('2025-07-01');

      const result = earliestSafeEntry(presence, today, {
        complianceStartDate: EARLY_COMPLIANCE_START,
        limit: 60,
      });

      expect(result).not.toBeNull();
    });
  });

  describe('boundary conditions', () => {
    it('handles exactly at safe threshold (89 days)', () => {
      const dates = generateDates('2025-04-02', 89);
      const presence = createPresence(dates);
      const today = new Date('2025-07-01');

      const result = earliestSafeEntry(presence, today, {
        complianceStartDate: EARLY_COMPLIANCE_START,
      });

      // 89 days used is still safe (can enter)
      expect(result).toBeNull();
    });

    it('returns correct date for massive overage', () => {
      // 180 days used - completely fills the window
      const dates = generateDates('2025-01-02', 180);
      const presence = createPresence(dates);
      const today = new Date('2025-07-01');

      const result = earliestSafeEntry(presence, today, {
        complianceStartDate: EARLY_COMPLIANCE_START,
      });

      expect(result).not.toBeNull();
      // Should find a date after enough days expire
    });
  });
});

describe('daysUntilCompliant - additional edge cases', () => {
  describe('custom limit', () => {
    it('returns 0 when under custom limit', () => {
      const dates = generateDates('2025-06-01', 30);
      const presence = createPresence(dates);
      const today = new Date('2025-07-01');

      const result = daysUntilCompliant(presence, today, {
        complianceStartDate: EARLY_COMPLIANCE_START,
        limit: 60,
      });

      expect(result).toBe(0);
    });

    it('returns wait days when over custom limit', () => {
      // 60 days used, custom limit 60
      const dates = generateDates('2025-05-01', 60);
      const presence = createPresence(dates);
      const today = new Date('2025-07-01');

      const result = daysUntilCompliant(presence, today, {
        complianceStartDate: EARLY_COMPLIANCE_START,
        limit: 60,
      });

      expect(result).toBeGreaterThan(0);
    });
  });
});

describe('getSafeEntryInfo - additional edge cases', () => {
  describe('custom limit', () => {
    it('uses custom limit for calculations', () => {
      const dates = generateDates('2025-06-01', 30);
      const presence = createPresence(dates);
      const today = new Date('2025-07-01');

      const result = getSafeEntryInfo(presence, today, {
        complianceStartDate: EARLY_COMPLIANCE_START,
        limit: 60,
      });

      expect(result.canEnterToday).toBe(true);
      expect(result.daysUsedOnEntry).toBe(30);
    });

    it('reports correct info when over custom limit', () => {
      // 60 days used, custom limit 60
      const dates = generateDates('2025-05-01', 60);
      const presence = createPresence(dates);
      const today = new Date('2025-07-01');

      const result = getSafeEntryInfo(presence, today, {
        complianceStartDate: EARLY_COMPLIANCE_START,
        limit: 60,
      });

      expect(result.canEnterToday).toBe(false);
      expect(result.earliestSafeDate).not.toBeNull();
      expect(result.daysUntilCompliant).toBeGreaterThan(0);
      // On safe date, days used should be at or below limit - 1
      expect(result.daysUsedOnEntry).toBeLessThanOrEqual(59);
    });
  });

  describe('input validation', () => {
    it('throws InvalidReferenceDateError for undefined', () => {
      const presence = createPresence(['2025-06-01']);

      expect(() =>
        getSafeEntryInfo(presence, undefined as unknown as Date)
      ).toThrow(InvalidReferenceDateError);
    });

    it('throws InvalidReferenceDateError for non-Date object', () => {
      const presence = createPresence(['2025-06-01']);

      expect(() =>
        getSafeEntryInfo(presence, '2025-07-01' as unknown as Date)
      ).toThrow(InvalidReferenceDateError);
    });
  });
});
