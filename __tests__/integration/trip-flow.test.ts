/**
 * @fileoverview Trip management integration tests
 *
 * Tests the full trip lifecycle:
 * - Add trip → recalculates days remaining
 * - Edit trip dates → updates compliance status
 * - Delete trip → improves days remaining
 * - Breach detection and warnings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  presenceDays,
  calculateDaysRemaining,
  calculateCompliance,
  getRiskLevel,
} from '@/lib/compliance';
import {
  createTrip,
  createConfig,
  createTripsWithDaysUsed,
  createOverlappingTrips,
  createMixedCountryTrips,
} from '../utils/factories';
import type { Trip, ComplianceConfig } from '@/lib/compliance/types';

describe('Trip management flow', () => {
  describe('add trip → recalculates days remaining', () => {
    it('single trip reduces days remaining correctly', () => {
      const config = createConfig({ referenceDate: '2025-12-01' });

      // Initial state: no trips
      const initialResult = calculateCompliance([], config);
      expect(initialResult.daysRemaining).toBe(90);
      expect(initialResult.riskLevel).toBe('green');

      // Add a 10-day trip
      const trips = [createTrip({ entryDate: '2025-11-01', exitDate: '2025-11-10' })];
      const afterAddResult = calculateCompliance(trips, config);

      expect(afterAddResult.daysUsed).toBe(10);
      expect(afterAddResult.daysRemaining).toBe(80);
      expect(afterAddResult.riskLevel).toBe('green');
    });

    it('multiple trips accumulate correctly', () => {
      // Use reference date AFTER all trips end to ensure full day counts
      const config = createConfig({ referenceDate: '2025-12-20' });

      // Add first trip: 10 days (Nov 1-10 inclusive)
      const trip1 = createTrip({ entryDate: '2025-11-01', exitDate: '2025-11-10' });
      const after1 = calculateCompliance([trip1], config);
      expect(after1.daysRemaining).toBe(80);

      // Add second trip: 5 days (Nov 20-24 inclusive)
      const trip2 = createTrip({ entryDate: '2025-11-20', exitDate: '2025-11-24' });
      const after2 = calculateCompliance([trip1, trip2], config);
      expect(after2.daysRemaining).toBe(75);

      // Add third trip: 15 days (Dec 1-15 inclusive)
      const trip3 = createTrip({ entryDate: '2025-12-01', exitDate: '2025-12-15' });
      const after3 = calculateCompliance([trip1, trip2, trip3], config);
      expect(after3.daysRemaining).toBe(60);
    });

    it('overlapping trips are deduplicated', () => {
      const config = createConfig({ referenceDate: '2025-12-01' });
      const trips = createOverlappingTrips();

      const result = calculateCompliance(trips, config);

      // Nov 1-15 = 15 unique days, not 10 + 11 = 21
      expect(result.daysUsed).toBe(15);
      expect(result.daysRemaining).toBe(75);
    });
  });

  describe('edit trip dates → updates compliance status', () => {
    it('extending trip reduces days remaining', () => {
      const config = createConfig({ referenceDate: '2025-12-01' });

      // Original: 5 days
      const originalTrips = [createTrip({ entryDate: '2025-11-01', exitDate: '2025-11-05' })];
      const original = calculateCompliance(originalTrips, config);
      expect(original.daysRemaining).toBe(85);

      // Extended: 10 days
      const editedTrips = [createTrip({ entryDate: '2025-11-01', exitDate: '2025-11-10' })];
      const edited = calculateCompliance(editedTrips, config);
      expect(edited.daysRemaining).toBe(80);

      // Difference should be 5 days
      expect(original.daysRemaining - edited.daysRemaining).toBe(5);
    });

    it('shortening trip improves days remaining', () => {
      const config = createConfig({ referenceDate: '2025-12-01' });

      // Original: 15 days
      const originalTrips = [createTrip({ entryDate: '2025-11-01', exitDate: '2025-11-15' })];
      const original = calculateCompliance(originalTrips, config);
      expect(original.daysRemaining).toBe(75);

      // Shortened: 5 days
      const editedTrips = [createTrip({ entryDate: '2025-11-01', exitDate: '2025-11-05' })];
      const edited = calculateCompliance(editedTrips, config);
      expect(edited.daysRemaining).toBe(85);

      // Should have gained 10 days
      expect(edited.daysRemaining - original.daysRemaining).toBe(10);
    });

    it('moving trip to different dates recalculates correctly', () => {
      const config = createConfig({ referenceDate: '2025-12-01' });

      // Original: Nov 1-10 (10 days)
      const originalTrips = [createTrip({ entryDate: '2025-11-01', exitDate: '2025-11-10' })];

      // Moved: Nov 15-20 (6 days)
      const movedTrips = [createTrip({ entryDate: '2025-11-15', exitDate: '2025-11-20' })];

      const original = calculateCompliance(originalTrips, config);
      const moved = calculateCompliance(movedTrips, config);

      expect(original.daysUsed).toBe(10);
      expect(moved.daysUsed).toBe(6);
      expect(moved.daysRemaining - original.daysRemaining).toBe(4);
    });

    it('changing to non-Schengen country improves compliance', () => {
      const config = createConfig({ referenceDate: '2025-12-01' });

      // Original: France (Schengen) 10 days
      const schengenTrip = [createTrip({ entryDate: '2025-11-01', exitDate: '2025-11-10', country: 'FR' })];
      const schengenResult = calculateCompliance(schengenTrip, config);
      expect(schengenResult.daysUsed).toBe(10);

      // Changed: Ireland (non-Schengen) 10 days
      const nonSchengenTrip = [createTrip({ entryDate: '2025-11-01', exitDate: '2025-11-10', country: 'IE' })];
      const nonSchengenResult = calculateCompliance(nonSchengenTrip, config);
      expect(nonSchengenResult.daysUsed).toBe(0);
    });
  });

  describe('delete trip → improves days remaining', () => {
    it('deleting trip restores days', () => {
      const config = createConfig({ referenceDate: '2025-12-01' });

      const trips = [
        createTrip({ entryDate: '2025-11-01', exitDate: '2025-11-10' }),
        createTrip({ entryDate: '2025-11-15', exitDate: '2025-11-20' }),
      ];

      // Before delete: 16 days used
      const beforeDelete = calculateCompliance(trips, config);
      expect(beforeDelete.daysUsed).toBe(16);
      expect(beforeDelete.daysRemaining).toBe(74);

      // After delete first trip: 6 days used
      const afterDelete = calculateCompliance([trips[1]], config);
      expect(afterDelete.daysUsed).toBe(6);
      expect(afterDelete.daysRemaining).toBe(84);
    });

    it('deleting last trip returns to 90 days remaining', () => {
      const config = createConfig({ referenceDate: '2025-12-01' });

      const trips = [createTrip({ entryDate: '2025-11-01', exitDate: '2025-11-10' })];

      const beforeDelete = calculateCompliance(trips, config);
      expect(beforeDelete.daysRemaining).toBe(80);

      const afterDelete = calculateCompliance([], config);
      expect(afterDelete.daysRemaining).toBe(90);
    });
  });

  describe('breach detection', () => {
    it('trip causing breach shows red status', () => {
      const config = createConfig({ referenceDate: '2026-02-01' });

      // Create 95 days of trips (5 over limit)
      const trips = createTripsWithDaysUsed(95);

      const result = calculateCompliance(trips, config);

      expect(result.daysUsed).toBe(95);
      expect(result.daysRemaining).toBe(-5);
      expect(result.riskLevel).toBe('red');
      expect(result.isCompliant).toBe(false);
    });

    it('approaching limit triggers amber warning', () => {
      const config = createConfig({ referenceDate: '2026-01-15' });

      // 75 days used, 15 remaining (amber zone: 10-29)
      const trips = createTripsWithDaysUsed(75);
      const result = calculateCompliance(trips, config);

      expect(result.daysRemaining).toBe(15);
      expect(result.riskLevel).toBe('amber');
    });

    it('exactly 90 days is compliant but critical', () => {
      const config = createConfig({ referenceDate: '2026-01-10' });

      const trips = createTripsWithDaysUsed(90);
      const result = calculateCompliance(trips, config);

      expect(result.daysUsed).toBe(90);
      expect(result.daysRemaining).toBe(0);
      expect(result.isCompliant).toBe(true);
      expect(result.riskLevel).toBe('red'); // 0 remaining = red
    });
  });

  describe('risk level transitions', () => {
    it('green → amber when approaching limit', () => {
      // Reference date must be well after trips end to count all days
      // 65 days from Oct 12 ends Dec 15, so use a later reference date
      const config = createConfig({ referenceDate: '2026-02-01' });

      // Start with 50 days used (40 remaining = green, since >=30)
      const trips50 = createTripsWithDaysUsed(50);
      expect(calculateCompliance(trips50, config).riskLevel).toBe('green');

      // 65 days used (25 remaining = amber, since <30 and >=10)
      const trips65 = createTripsWithDaysUsed(65);
      expect(calculateCompliance(trips65, config).riskLevel).toBe('amber');
    });

    it('amber → red when critically low', () => {
      // Reference date must be after trip ends
      const config = createConfig({ referenceDate: '2026-02-15' });

      // 75 days (15 remaining = amber, since <30 and >=10)
      const trips75 = createTripsWithDaysUsed(75);
      expect(calculateCompliance(trips75, config).riskLevel).toBe('amber');

      // 82 days (8 remaining = red, since <10)
      const trips82 = createTripsWithDaysUsed(82);
      expect(calculateCompliance(trips82, config).riskLevel).toBe('red');
    });

    it('deleting trips can restore green status', () => {
      // Reference date must be after trips end
      const config = createConfig({ referenceDate: '2026-02-01' });

      // 65 days (25 remaining = amber)
      const trips65 = createTripsWithDaysUsed(65);
      const amberResult = calculateCompliance(trips65, config);
      expect(amberResult.riskLevel).toBe('amber');

      // Delete trips to 50 days (40 remaining = green)
      const trips50 = createTripsWithDaysUsed(50);
      const greenResult = calculateCompliance(trips50, config);
      expect(greenResult.riskLevel).toBe('green');
    });
  });

  describe('window expiry affects calculations', () => {
    it('old trips falling out of window restore days', () => {
      // Trip from Oct 12-21 (10 days)
      const trips = [createTrip({ entryDate: '2025-10-12', exitDate: '2025-10-21' })];

      // On Nov 1: all 10 days in window
      const nov1Config = createConfig({ referenceDate: '2025-11-01' });
      const nov1Result = calculateCompliance(trips, nov1Config);
      expect(nov1Result.daysUsed).toBe(10);

      // On Apr 22 (192 days later): window is [Oct 24, Apr 21]
      // Oct 12-21 trips have fallen out
      const apr22Config = createConfig({ referenceDate: '2026-04-22' });
      const apr22Result = calculateCompliance(trips, apr22Config);
      expect(apr22Result.daysUsed).toBe(0);
    });

    it('partial trip expiry is calculated correctly', () => {
      // Trip: Oct 12-31 (20 days)
      const trips = [createTrip({ entryDate: '2025-10-12', exitDate: '2025-10-31' })];

      // On Apr 15: window is [Oct 17, Apr 14]
      // Oct 12-16 (5 days) have fallen out, Oct 17-31 (15 days) remain
      const apr15Config = createConfig({ referenceDate: '2026-04-15' });
      const apr15Result = calculateCompliance(trips, apr15Config);
      expect(apr15Result.daysUsed).toBe(15);
    });
  });
});
