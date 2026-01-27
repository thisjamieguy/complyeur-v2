import { NON_COUNTING_VALUES } from './constants';
import type { GanttParseResult, GanttValidationResult } from './types';

/**
 * Validates parsed Gantt data for common issues.
 */
export function validateGanttData(result: GanttParseResult): GanttValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!result.success) {
    errors.push(result.error || 'Unknown parsing error');
    return { isValid: false, errors, warnings };
  }

  // Check date column gaps
  const dates = result.dateColumns.map((dc) => dc.date.date).filter((d): d is string => !!d);
  if (dates.length > 1) {
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const dayDiff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (dayDiff > 1) {
        warnings.push(
          `Gap detected: ${dayDiff - 1} day(s) missing between ${dates[i - 1]} and ${dates[i]}`
        );
      }
    }
  }

  // Check for unrecognized countries
  const unrecognized = new Set<string>();
  for (const row of result.rows) {
    for (const cell of row.cells) {
      if (cell.rawValue && !cell.countryCode && cell.rawValue !== '-') {
        const lower = cell.rawValue.toLowerCase();
        if (!NON_COUNTING_VALUES.has(lower)) {
          unrecognized.add(cell.rawValue);
        }
      }
    }
  }
  if (unrecognized.size > 0) {
    warnings.push(
      `Unrecognized values: ${Array.from(unrecognized).slice(0, 5).join(', ')}${unrecognized.size > 5 ? ` (and ${unrecognized.size - 5} more)` : ''}`
    );
  }

  // Check ignored columns
  if (result.ignoredColumns.length > 0) {
    const ignored = result.ignoredColumns.map((c) => c.header).slice(0, 3);
    warnings.push(
      `${result.ignoredColumns.length} column(s) ignored: ${ignored.join(', ')}${result.ignoredColumns.length > 3 ? '...' : ''}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
