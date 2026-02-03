/**
 * @fileoverview Tests for risk level calculation.
 */

import { describe, it, expect } from 'vitest';
import {
  getRiskLevel,
  getStatusFromDaysUsed,
  getRiskDescription,
  getRiskAction,
  getSeverityScore,
} from '../risk-calculator';
import { InvalidConfigError } from '../errors';

describe('getRiskLevel', () => {
  describe('default thresholds', () => {
    // New thresholds: green >= 16, amber >= 1, red < 1
    // This means: warning at 75+ days used (15 or fewer remaining)
    it('returns green for 16+ days remaining', () => {
      expect(getRiskLevel(16)).toBe('green');
      expect(getRiskLevel(30)).toBe('green');
      expect(getRiskLevel(45)).toBe('green');
      expect(getRiskLevel(90)).toBe('green');
    });

    it('returns amber for 1-15 days remaining (warning zone)', () => {
      expect(getRiskLevel(1)).toBe('amber');
      expect(getRiskLevel(5)).toBe('amber');
      expect(getRiskLevel(10)).toBe('amber');
      expect(getRiskLevel(15)).toBe('amber');
    });

    it('returns red for 0 or negative days remaining (violation)', () => {
      expect(getRiskLevel(0)).toBe('red');
      expect(getRiskLevel(-1)).toBe('red');
      expect(getRiskLevel(-5)).toBe('red');
      expect(getRiskLevel(-10)).toBe('red');
    });

    it('returns red for negative days (over limit)', () => {
      expect(getRiskLevel(-1)).toBe('red');
      expect(getRiskLevel(-5)).toBe('red');
      expect(getRiskLevel(-10)).toBe('red');
    });
  });

  describe('threshold boundaries', () => {
    it('green boundary is >= 16', () => {
      expect(getRiskLevel(16)).toBe('green');
      expect(getRiskLevel(15)).toBe('amber');
    });

    it('amber boundary is >= 1', () => {
      expect(getRiskLevel(1)).toBe('amber');
      expect(getRiskLevel(0)).toBe('red');
    });
  });

  describe('custom thresholds', () => {
    it('uses custom green threshold', () => {
      const thresholds = { green: 20, amber: 5 };

      expect(getRiskLevel(20, thresholds)).toBe('green');
      expect(getRiskLevel(19, thresholds)).toBe('amber');
    });

    it('uses custom amber threshold', () => {
      const thresholds = { green: 30, amber: 15 };

      expect(getRiskLevel(15, thresholds)).toBe('amber');
      expect(getRiskLevel(14, thresholds)).toBe('red');
    });

    it('throws InvalidConfigError for amber >= green', () => {
      const thresholds = { green: 20, amber: 20 };

      expect(() => getRiskLevel(25, thresholds)).toThrow(InvalidConfigError);
    });

    it('throws InvalidConfigError for negative thresholds', () => {
      expect(() => getRiskLevel(25, { green: -1, amber: 5 })).toThrow(InvalidConfigError);
      expect(() => getRiskLevel(25, { green: 30, amber: -1 })).toThrow(InvalidConfigError);
    });

    it('throws InvalidConfigError for NaN thresholds', () => {
      expect(() => getRiskLevel(25, { green: NaN, amber: 5 })).toThrow(InvalidConfigError);
      expect(() => getRiskLevel(25, { green: 30, amber: NaN })).toThrow(InvalidConfigError);
    });
  });
});

describe('getStatusFromDaysUsed', () => {
  describe('default thresholds', () => {
    // Default: greenMax: 60, amberMax: 75, redMax: 89
    it('returns green for 0-60 days used', () => {
      expect(getStatusFromDaysUsed(0)).toBe('green');
      expect(getStatusFromDaysUsed(30)).toBe('green');
      expect(getStatusFromDaysUsed(60)).toBe('green');
    });

    it('returns amber for 61-75 days used', () => {
      expect(getStatusFromDaysUsed(61)).toBe('amber');
      expect(getStatusFromDaysUsed(70)).toBe('amber');
      expect(getStatusFromDaysUsed(75)).toBe('amber');
    });

    it('returns red for 76-89 days used', () => {
      expect(getStatusFromDaysUsed(76)).toBe('red');
      expect(getStatusFromDaysUsed(80)).toBe('red');
      expect(getStatusFromDaysUsed(89)).toBe('red');
    });

    it('returns breach for 90+ days used (always)', () => {
      expect(getStatusFromDaysUsed(90)).toBe('breach');
      expect(getStatusFromDaysUsed(95)).toBe('breach');
      expect(getStatusFromDaysUsed(100)).toBe('breach');
      expect(getStatusFromDaysUsed(150)).toBe('breach');
    });
  });

  describe('threshold boundaries', () => {
    it('green/amber boundary at 60/61', () => {
      expect(getStatusFromDaysUsed(60)).toBe('green');
      expect(getStatusFromDaysUsed(61)).toBe('amber');
    });

    it('amber/red boundary at 75/76', () => {
      expect(getStatusFromDaysUsed(75)).toBe('amber');
      expect(getStatusFromDaysUsed(76)).toBe('red');
    });

    it('red/breach boundary at 89/90 (non-configurable)', () => {
      expect(getStatusFromDaysUsed(89)).toBe('red');
      expect(getStatusFromDaysUsed(90)).toBe('breach');
    });
  });

  describe('custom thresholds', () => {
    it('uses custom greenMax threshold', () => {
      const thresholds = { greenMax: 50, amberMax: 70, redMax: 85 };

      expect(getStatusFromDaysUsed(50, thresholds)).toBe('green');
      expect(getStatusFromDaysUsed(51, thresholds)).toBe('amber');
    });

    it('uses custom amberMax threshold', () => {
      const thresholds = { greenMax: 50, amberMax: 70, redMax: 85 };

      expect(getStatusFromDaysUsed(70, thresholds)).toBe('amber');
      expect(getStatusFromDaysUsed(71, thresholds)).toBe('red');
    });

    it('breach is always 90+ regardless of custom thresholds', () => {
      const thresholds = { greenMax: 80, amberMax: 85, redMax: 88 };

      expect(getStatusFromDaysUsed(89, thresholds)).toBe('red');
      expect(getStatusFromDaysUsed(90, thresholds)).toBe('breach');
    });

    it('throws InvalidConfigError for non-numeric greenMax', () => {
      expect(() =>
        getStatusFromDaysUsed(50, { greenMax: NaN, amberMax: 75, redMax: 89 })
      ).toThrow(InvalidConfigError);
    });

    it('throws InvalidConfigError for non-numeric amberMax', () => {
      expect(() =>
        getStatusFromDaysUsed(50, { greenMax: 60, amberMax: NaN, redMax: 89 })
      ).toThrow(InvalidConfigError);
    });

    it('throws InvalidConfigError for non-numeric redMax', () => {
      expect(() =>
        getStatusFromDaysUsed(50, { greenMax: 60, amberMax: 75, redMax: NaN })
      ).toThrow(InvalidConfigError);
    });

    it('throws InvalidConfigError for greenMax out of range', () => {
      expect(() =>
        getStatusFromDaysUsed(50, { greenMax: 0, amberMax: 75, redMax: 89 })
      ).toThrow(InvalidConfigError);
      expect(() =>
        getStatusFromDaysUsed(50, { greenMax: 90, amberMax: 91, redMax: 92 })
      ).toThrow(InvalidConfigError);
    });

    it('throws InvalidConfigError for amberMax out of range', () => {
      expect(() =>
        getStatusFromDaysUsed(50, { greenMax: 60, amberMax: 0, redMax: 89 })
      ).toThrow(InvalidConfigError);
      expect(() =>
        getStatusFromDaysUsed(50, { greenMax: 60, amberMax: 90, redMax: 91 })
      ).toThrow(InvalidConfigError);
    });

    it('throws InvalidConfigError for redMax out of range', () => {
      expect(() =>
        getStatusFromDaysUsed(50, { greenMax: 60, amberMax: 75, redMax: 0 })
      ).toThrow(InvalidConfigError);
      expect(() =>
        getStatusFromDaysUsed(50, { greenMax: 60, amberMax: 75, redMax: 90 })
      ).toThrow(InvalidConfigError);
    });

    it('throws InvalidConfigError for greenMax >= amberMax', () => {
      expect(() =>
        getStatusFromDaysUsed(50, { greenMax: 75, amberMax: 75, redMax: 89 })
      ).toThrow(InvalidConfigError);
      expect(() =>
        getStatusFromDaysUsed(50, { greenMax: 80, amberMax: 75, redMax: 89 })
      ).toThrow(InvalidConfigError);
    });

    it('throws InvalidConfigError for amberMax >= redMax', () => {
      expect(() =>
        getStatusFromDaysUsed(50, { greenMax: 60, amberMax: 89, redMax: 89 })
      ).toThrow(InvalidConfigError);
      expect(() =>
        getStatusFromDaysUsed(50, { greenMax: 60, amberMax: 89, redMax: 85 })
      ).toThrow(InvalidConfigError);
    });
  });
});

describe('getRiskDescription', () => {
  it('returns appropriate description for green', () => {
    const description = getRiskDescription('green');
    expect(description).toContain('Low risk');
  });

  it('returns appropriate description for amber', () => {
    const description = getRiskDescription('amber');
    expect(description).toContain('Moderate risk');
  });

  it('returns appropriate description for red', () => {
    const description = getRiskDescription('red');
    expect(description).toContain('High risk');
  });

  it('returns appropriate description for breach', () => {
    const description = getRiskDescription('breach');
    expect(description).toContain('Breach');
    expect(description).toContain('90-day limit');
  });
});

describe('getRiskAction', () => {
  it('returns travel can proceed for green', () => {
    const action = getRiskAction('green', 45);
    expect(action).toContain('proceed normally');
  });

  it('returns caution message for amber', () => {
    const action = getRiskAction('amber', 20);
    expect(action).toContain('carefully');
  });

  it('returns stay outside message for red (over limit)', () => {
    const action = getRiskAction('red', -5);
    expect(action).toContain('Over limit');
    expect(action).toContain('5 days');
    expect(action).toContain('outside Schengen');
  });

  it('returns avoid travel message for red (near limit)', () => {
    const action = getRiskAction('red', 5);
    expect(action).toContain('Limit nearly reached');
  });

  it('handles singular day for over limit', () => {
    const action = getRiskAction('red', -1);
    expect(action).toContain('1 day');
    expect(action).not.toContain('1 days');
  });

  it('handles plural days for over limit', () => {
    const action = getRiskAction('red', -2);
    expect(action).toContain('2 days');
  });

  it('returns breach message for breach status', () => {
    const action = getRiskAction('breach', -5);
    expect(action).toContain('Over limit');
    expect(action).toContain('5 days');
    expect(action).toContain('outside Schengen');
  });

  it('handles singular day for breach status', () => {
    const action = getRiskAction('breach', -1);
    expect(action).toContain('1 day');
    expect(action).not.toContain('1 days');
  });
});

describe('getSeverityScore', () => {
  describe('score ranges', () => {
    // New thresholds: green >= 16, amber >= 1, red < 1
    it('returns 0-33 for green zone (16+ days remaining)', () => {
      expect(getSeverityScore(90)).toBeGreaterThanOrEqual(0);
      expect(getSeverityScore(90)).toBeLessThanOrEqual(33);

      expect(getSeverityScore(45)).toBeGreaterThanOrEqual(0);
      expect(getSeverityScore(45)).toBeLessThanOrEqual(33);

      expect(getSeverityScore(16)).toBeGreaterThanOrEqual(0);
      expect(getSeverityScore(16)).toBeLessThanOrEqual(33);
    });

    it('returns 34-66 for amber zone (1-15 days remaining)', () => {
      expect(getSeverityScore(15)).toBeGreaterThanOrEqual(34);
      expect(getSeverityScore(15)).toBeLessThanOrEqual(66);

      expect(getSeverityScore(8)).toBeGreaterThanOrEqual(34);
      expect(getSeverityScore(8)).toBeLessThanOrEqual(66);

      expect(getSeverityScore(1)).toBeGreaterThanOrEqual(34);
      expect(getSeverityScore(1)).toBeLessThanOrEqual(66);
    });

    it('returns 67-100 for red zone (0 days remaining)', () => {
      expect(getSeverityScore(0)).toBeGreaterThanOrEqual(67);
      expect(getSeverityScore(0)).toBeLessThanOrEqual(100);
    });

    it('returns 100+ for over limit (negative days)', () => {
      expect(getSeverityScore(-1)).toBeGreaterThan(100);
      expect(getSeverityScore(-5)).toBeGreaterThan(100);
      expect(getSeverityScore(-10)).toBeGreaterThan(100);
    });
  });

  describe('ordering', () => {
    it('higher severity for fewer days remaining', () => {
      expect(getSeverityScore(30)).toBeLessThan(getSeverityScore(20));
      expect(getSeverityScore(20)).toBeLessThan(getSeverityScore(10));
      expect(getSeverityScore(10)).toBeLessThan(getSeverityScore(5));
      expect(getSeverityScore(5)).toBeLessThan(getSeverityScore(0));
      expect(getSeverityScore(0)).toBeLessThan(getSeverityScore(-5));
    });

    it('over limit increases severity further', () => {
      expect(getSeverityScore(-1)).toBeLessThan(getSeverityScore(-5));
      expect(getSeverityScore(-5)).toBeLessThan(getSeverityScore(-10));
    });
  });

  describe('custom thresholds', () => {
    it('respects custom thresholds for scoring', () => {
      const thresholds = { green: 20, amber: 5 };

      // 20 days should be green with custom thresholds
      const score = getSeverityScore(20, thresholds);
      expect(score).toBeLessThanOrEqual(33);
    });
  });
});
