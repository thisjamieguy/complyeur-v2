/**
 * @fileoverview Risk level calculation for Schengen compliance.
 *
 * Maps days remaining to traffic-light risk levels:
 * - green: Safe zone (30+ days remaining)
 * - amber: Caution zone (10-29 days remaining)
 * - red: Danger zone (<10 days remaining or over limit)
 *
 * @version 2025-01-07
 */

import { DEFAULT_RISK_THRESHOLDS } from './constants';
import { InvalidConfigError } from './errors';
import type { RiskLevel, RiskThresholds } from './types';

/**
 * Validates risk thresholds configuration.
 *
 * @param thresholds - Thresholds to validate
 * @throws InvalidConfigError if thresholds are invalid
 */
function validateThresholds(thresholds: RiskThresholds): void {
  if (typeof thresholds.green !== 'number' || isNaN(thresholds.green)) {
    throw new InvalidConfigError('thresholds.green', 'Green threshold must be a number');
  }
  if (typeof thresholds.amber !== 'number' || isNaN(thresholds.amber)) {
    throw new InvalidConfigError('thresholds.amber', 'Amber threshold must be a number');
  }
  if (thresholds.green < 0) {
    throw new InvalidConfigError('thresholds.green', 'Green threshold cannot be negative');
  }
  if (thresholds.amber < 0) {
    throw new InvalidConfigError('thresholds.amber', 'Amber threshold cannot be negative');
  }
  if (thresholds.amber >= thresholds.green) {
    throw new InvalidConfigError(
      'thresholds.amber',
      `Amber threshold (${thresholds.amber}) must be less than green threshold (${thresholds.green})`
    );
  }
}

/**
 * Determines the risk level based on days remaining.
 *
 * Risk levels:
 * - green: daysRemaining >= green threshold (default 30)
 * - amber: daysRemaining >= amber threshold (default 10) AND < green threshold
 * - red: daysRemaining < amber threshold OR negative (over limit)
 *
 * @param daysRemaining - Number of days remaining (can be negative if over limit)
 * @param thresholds - Optional custom thresholds
 * @returns Risk level: 'green', 'amber', or 'red'
 *
 * @throws InvalidConfigError if thresholds are invalid
 *
 * @example
 * getRiskLevel(45)  // 'green'
 * getRiskLevel(20)  // 'amber'
 * getRiskLevel(5)   // 'red'
 * getRiskLevel(-3)  // 'red' (over limit)
 */
export function getRiskLevel(
  daysRemaining: number,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS
): RiskLevel {
  validateThresholds(thresholds);

  // Any negative value or value below amber threshold is red
  if (daysRemaining < thresholds.amber) {
    return 'red';
  }

  // Between amber and green thresholds
  if (daysRemaining < thresholds.green) {
    return 'amber';
  }

  // At or above green threshold
  return 'green';
}

/**
 * Gets a human-readable description of the risk level.
 *
 * @param riskLevel - The risk level
 * @returns Description string
 *
 * @example
 * getRiskDescription('green')  // 'Low risk - plenty of days remaining'
 * getRiskDescription('amber')  // 'Moderate risk - approaching limit'
 * getRiskDescription('red')    // 'High risk - at or over limit'
 */
export function getRiskDescription(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'green':
      return 'Low risk - plenty of days remaining';
    case 'amber':
      return 'Moderate risk - approaching limit';
    case 'red':
      return 'High risk - at or over limit';
  }
}

/**
 * Gets the appropriate action recommendation based on risk level.
 *
 * @param riskLevel - The risk level
 * @param daysRemaining - Days remaining (for specific messaging)
 * @returns Action recommendation string
 */
export function getRiskAction(riskLevel: RiskLevel, daysRemaining: number): string {
  switch (riskLevel) {
    case 'green':
      return 'Travel planning can proceed normally.';
    case 'amber':
      return 'Plan upcoming travel carefully. Consider spreading out Schengen visits.';
    case 'red':
      if (daysRemaining < 0) {
        const overBy = Math.abs(daysRemaining);
        return `Over limit by ${overBy} day${overBy === 1 ? '' : 's'}. Employee must remain outside Schengen until compliant.`;
      }
      return 'Limit nearly reached. Avoid new Schengen travel unless absolutely necessary.';
  }
}

/**
 * Calculates the severity score for sorting/prioritization.
 *
 * Higher scores indicate more urgent situations.
 * Score ranges:
 * - green: 0-33
 * - amber: 34-66
 * - red: 67-100+
 *
 * @param daysRemaining - Days remaining (can be negative)
 * @param thresholds - Risk thresholds
 * @returns Severity score (0-100, can exceed 100 if deeply over limit)
 */
export function getSeverityScore(
  daysRemaining: number,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS
): number {
  // Over limit: score starts at 100 and increases
  if (daysRemaining < 0) {
    return 100 + Math.abs(daysRemaining);
  }

  // Red zone (0 to amber threshold): 67-100
  if (daysRemaining < thresholds.amber) {
    const range = thresholds.amber;
    const position = thresholds.amber - daysRemaining;
    return 67 + Math.round((position / range) * 33);
  }

  // Amber zone (amber to green threshold): 34-66
  if (daysRemaining < thresholds.green) {
    const range = thresholds.green - thresholds.amber;
    const position = thresholds.green - daysRemaining;
    return 34 + Math.round((position / range) * 32);
  }

  // Green zone: 0-33 (lower is better)
  // Max out at 90 days remaining for score calculation
  const maxGreen = 90;
  const effectiveDays = Math.min(daysRemaining, maxGreen);
  const greenRange = maxGreen - thresholds.green;
  const position = effectiveDays - thresholds.green;
  return Math.max(0, 33 - Math.round((position / greenRange) * 33));
}
