/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImportSummary } from '../ImportSummary';
import type { ImportResult } from '@/types/import';

function createResult(overrides: Partial<ImportResult> = {}): ImportResult {
  return {
    success: true,
    employees_created: 0,
    employees_updated: 0,
    trips_created: 0,
    trips_skipped: 0,
    errors: [],
    warnings: [],
    ...overrides,
  };
}

describe('ImportSummary', () => {
  it('shows employee import totals for created and updated records', () => {
    render(
      <ImportSummary
        format="employees"
        result={createResult({
          employees_created: 3,
          employees_updated: 2,
        })}
      />
    );

    expect(screen.getByText("You're all set!")).toBeInTheDocument();
    expect(screen.getByText('Employees Created')).toBeInTheDocument();
    expect(screen.getByText('Employees Updated')).toBeInTheDocument();
    expect(screen.getByText('5 employees are now ready to track')).toBeInTheDocument();
  });

  it('shows trip import created and skipped counts with warning details', () => {
    render(
      <ImportSummary
        format="trips"
        result={createResult({
          trips_created: 4,
          trips_skipped: 2,
          warnings: [
            {
              row: 7,
              column: 'entry_date',
              value: '2025-11-01 - 2025-11-10',
              message: 'Trip already exists for this employee with the same dates, skipped',
              severity: 'warning',
            },
          ],
        })}
      />
    );

    expect(screen.getByText('Trips Created')).toBeInTheDocument();
    expect(screen.getByText('Trips Skipped')).toBeInTheDocument();
    expect(screen.getByText('Warnings')).toBeInTheDocument();
    expect(screen.getByText(/Trip already exists for this employee/i)).toBeInTheDocument();
  });

  it('renders failure state and error details when import is not fully successful', () => {
    render(
      <ImportSummary
        format="trips"
        result={createResult({
          success: false,
          trips_created: 1,
          errors: [
            {
              row: 3,
              column: 'employee_email',
              value: 'missing@test.com',
              message: 'No employee found with email "missing@test.com". Create the employee first or check the email address.',
              severity: 'error',
            },
          ],
        })}
      />
    );

    expect(screen.getByText('Import Failed')).toBeInTheDocument();
    expect(screen.getByText(/There were errors during the import process/i)).toBeInTheDocument();
    expect(screen.getByText(/No employee found with email/i)).toBeInTheDocument();
    expect(screen.getByText('Errors')).toBeInTheDocument();
  });
});
