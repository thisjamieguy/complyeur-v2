/**
 * @fileoverview Tests for risk level calculation.
 */

import { describe, it, expect } from 'vitest';
import {
  getRiskLevel,
  getRiskDescription,
  getRiskAction,
  getSeverityScore,
} from '../risk-calculator';
import { InvalidConfigError } from '../errors';

describe('getRiskLevel', () => {
  describe('default thresholds', () => {
    it('returns green for 30+ days remaining', () => {
      expect(getRiskLevel(30)).toBe('green');
      expect(getRiskLevel(45)).toBe('green');
      expect(getRiskLevel(90)).toBe('green');
    });

    it('returns amber for 10-29 days remaining', () => {
      expect(getRiskLevel(10)).toBe('amber');
      expect(getRiskLevel(15)).toBe('amber');
      expect(getRiskLevel(29)).toBe('amber');
    });

    it('returns red for less than 10 days remaining', () => {
      expect(getRiskLevel(9)).toBe('red');
      expect(getRiskLevel(5)).toBe('red');
      expect(getRiskLevel(1)).toBe('red');
      expect(getRiskLevel(0)).toBe('red');
    });

    it('returns red for negative days (over limit)', () => {
      expect(getRiskLevel(-1)).toBe('red');
      expect(getRiskLevel(-5)).toBe('red');
      expect(getRiskLevel(-10)).toBe('red');
    });
  });

  describe('threshold boundaries', () => {
    it('green boundary is >= 30', () => {
      expect(getRiskLevel(30)).toBe('green');
      expect(getRiskLevel(29)).toBe('amber');
    });

    it('amber boundary is >= 10', () => {
      expect(getRiskLevel(10)).toBe('amber');
      expect(getRiskLevel(9)).toBe('red');
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
});

describe('getSeverityScore', () => {
  describe('score ranges', () => {
    it('returns 0-33 for green zone', () => {
      expect(getSeverityScore(90)).toBeGreaterThanOrEqual(0);
      expect(getSeverityScore(90)).toBeLessThanOrEqual(33);

      expect(getSeverityScore(45)).toBeGreaterThanOrEqual(0);
      expect(getSeverityScore(45)).toBeLessThanOrEqual(33);

      expect(getSeverityScore(30)).toBeGreaterThanOrEqual(0);
      expect(getSeverityScore(30)).toBeLessThanOrEqual(33);
    });

    it('returns 34-66 for amber zone', () => {
      expect(getSeverityScore(29)).toBeGreaterThanOrEqual(34);
      expect(getSeverityScore(29)).toBeLessThanOrEqual(66);

      expect(getSeverityScore(20)).toBeGreaterThanOrEqual(34);
      expect(getSeverityScore(20)).toBeLessThanOrEqual(66);

      expect(getSeverityScore(10)).toBeGreaterThanOrEqual(34);
      expect(getSeverityScore(10)).toBeLessThanOrEqual(66);
    });

    it('returns 67-100 for red zone', () => {
      expect(getSeverityScore(9)).toBeGreaterThanOrEqual(67);
      expect(getSeverityScore(9)).toBeLessThanOrEqual(100);

      expect(getSeverityScore(5)).toBeGreaterThanOrEqual(67);
      expect(getSeverityScore(5)).toBeLessThanOrEqual(100);

      expect(getSeverityScore(0)).toBeGreaterThanOrEqual(67);
      expect(getSeverityScore(0)).toBeLessThanOrEqual(100);
    });

    it('returns 100+ for over limit', () => {
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
