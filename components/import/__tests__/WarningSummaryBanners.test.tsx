/**
 * @vitest-environment jsdom
 * @fileoverview Unit tests for WarningSummaryBanners component
 *
 * Tests the grouping and display of import validation warnings.
 * Key functionality tested:
 * - Grouping warnings by pattern (e.g., non-Schengen countries)
 * - Extracting country codes from warning messages
 * - Rendering grouped warning banners
 * - Expanding/collapsing to show affected rows
 */

import { describe, test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WarningSummaryBanners } from '../WarningSummaryBanners';
import { ValidatedRow, ParsedTripRow, ValidationError } from '@/types/import';

// Helper to create a validated trip row with warnings
function createValidatedTripRow(
  rowNumber: number,
  employeeName: string,
  country: string,
  entryDate: string,
  exitDate: string,
  warnings: ValidationError[] = [],
  errors: ValidationError[] = []
): ValidatedRow<ParsedTripRow> {
  return {
    row_number: rowNumber,
    data: {
      row_number: rowNumber,
      employee_email: `${employeeName.toLowerCase().replace(' ', '.')}@example.com`,
      employee_name: employeeName,
      entry_date: entryDate,
      exit_date: exitDate,
      country,
    },
    is_valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Helper to create a non-Schengen warning
function createNonSchengenWarning(
  rowNumber: number,
  countryCode: string
): ValidationError {
  return {
    row: rowNumber,
    column: 'country',
    value: countryCode,
    message: `${countryCode} is not a Schengen country. This trip will not count towards the 90/180 rule but will still be recorded.`,
    severity: 'warning',
  };
}

describe('WarningSummaryBanners', () => {
  describe('rendering', () => {
    test('returns null when no warnings exist', () => {
      const rows = [
        createValidatedTripRow(1, 'John Doe', 'DE', '2025-01-01', '2025-01-05'),
        createValidatedTripRow(2, 'Jane Doe', 'FR', '2025-01-10', '2025-01-15'),
      ];

      const { container } = render(<WarningSummaryBanners rows={rows} />);
      expect(container.firstChild).toBeNull();
    });

    test('renders warning banner when warnings exist', () => {
      const rows = [
        createValidatedTripRow(
          1,
          'John Doe',
          'GB',
          '2025-01-01',
          '2025-01-05',
          [createNonSchengenWarning(1, 'GB')]
        ),
      ];

      render(<WarningSummaryBanners rows={rows} />);
      expect(screen.getByText(/trip.*to non-Schengen/i)).toBeInTheDocument();
    });

    test('displays correct trip count for single warning', () => {
      const rows = [
        createValidatedTripRow(
          1,
          'John Doe',
          'GB',
          '2025-01-01',
          '2025-01-05',
          [createNonSchengenWarning(1, 'GB')]
        ),
      ];

      render(<WarningSummaryBanners rows={rows} />);
      expect(screen.getByText(/1 trip to non-Schengen country/i)).toBeInTheDocument();
    });

    test('displays correct trip count for multiple warnings', () => {
      const rows = [
        createValidatedTripRow(
          1,
          'John Doe',
          'GB',
          '2025-01-01',
          '2025-01-05',
          [createNonSchengenWarning(1, 'GB')]
        ),
        createValidatedTripRow(
          2,
          'John Doe',
          'GB',
          '2025-02-01',
          '2025-02-05',
          [createNonSchengenWarning(2, 'GB')]
        ),
        createValidatedTripRow(
          3,
          'John Doe',
          'IE',
          '2025-03-01',
          '2025-03-05',
          [createNonSchengenWarning(3, 'IE')]
        ),
      ];

      render(<WarningSummaryBanners rows={rows} />);
      expect(screen.getByText(/3 trips to non-Schengen countries/i)).toBeInTheDocument();
    });
  });

  describe('country grouping', () => {
    test('extracts and displays single country code', () => {
      const rows = [
        createValidatedTripRow(
          1,
          'John Doe',
          'GB',
          '2025-01-01',
          '2025-01-05',
          [createNonSchengenWarning(1, 'GB')]
        ),
      ];

      render(<WarningSummaryBanners rows={rows} />);
      expect(screen.getByText(/\(GB\)/)).toBeInTheDocument();
    });

    test('extracts and displays multiple country codes sorted', () => {
      const rows = [
        createValidatedTripRow(
          1,
          'John Doe',
          'IE',
          '2025-01-01',
          '2025-01-05',
          [createNonSchengenWarning(1, 'IE')]
        ),
        createValidatedTripRow(
          2,
          'Jane Doe',
          'GB',
          '2025-02-01',
          '2025-02-05',
          [createNonSchengenWarning(2, 'GB')]
        ),
      ];

      render(<WarningSummaryBanners rows={rows} />);
      // Countries should be sorted alphabetically: GB, IE
      expect(screen.getByText(/\(GB, IE\)/)).toBeInTheDocument();
    });

    test('deduplicates country codes when same country appears multiple times', () => {
      const rows = [
        createValidatedTripRow(
          1,
          'John Doe',
          'GB',
          '2025-01-01',
          '2025-01-05',
          [createNonSchengenWarning(1, 'GB')]
        ),
        createValidatedTripRow(
          2,
          'John Doe',
          'GB',
          '2025-02-01',
          '2025-02-05',
          [createNonSchengenWarning(2, 'GB')]
        ),
        createValidatedTripRow(
          3,
          'John Doe',
          'GB',
          '2025-03-01',
          '2025-03-05',
          [createNonSchengenWarning(3, 'GB')]
        ),
      ];

      render(<WarningSummaryBanners rows={rows} />);
      // Should only show GB once, not repeated
      expect(screen.getByText(/\(GB\)/)).toBeInTheDocument();
      expect(screen.queryByText(/GB, GB/)).not.toBeInTheDocument();
    });
  });

  describe('expansion/collapse', () => {
    test('shows affected rows when banner is clicked', () => {
      const rows = [
        createValidatedTripRow(
          12,
          'Steve Turkington',
          'GB',
          '2025-02-10',
          '2025-02-13',
          [createNonSchengenWarning(12, 'GB')]
        ),
      ];

      render(<WarningSummaryBanners rows={rows} />);

      // Initially, row details should not be visible
      expect(screen.queryByText('Row 12')).not.toBeInTheDocument();

      // Click to expand
      const banner = screen.getByRole('button');
      fireEvent.click(banner);

      // Now row details should be visible
      expect(screen.getByText('Row 12')).toBeInTheDocument();
      expect(screen.getByText(/Steve Turkington/)).toBeInTheDocument();
    });

    test('hides affected rows when banner is clicked again', () => {
      const rows = [
        createValidatedTripRow(
          12,
          'Steve Turkington',
          'GB',
          '2025-02-10',
          '2025-02-13',
          [createNonSchengenWarning(12, 'GB')]
        ),
      ];

      render(<WarningSummaryBanners rows={rows} />);

      const banner = screen.getByRole('button');

      // Click to expand
      fireEvent.click(banner);
      expect(screen.getByText('Row 12')).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(banner);
      expect(screen.queryByText('Row 12')).not.toBeInTheDocument();
    });

    test('displays correct date range in expanded details', () => {
      const rows = [
        createValidatedTripRow(
          12,
          'Steve Turkington',
          'GB',
          '2025-02-10',
          '2025-02-13',
          [createNonSchengenWarning(12, 'GB')]
        ),
      ];

      render(<WarningSummaryBanners rows={rows} />);

      const banner = screen.getByRole('button');
      fireEvent.click(banner);

      expect(screen.getByText(/2025-02-10 to 2025-02-13/)).toBeInTheDocument();
    });

    test('displays single date when entry and exit are same', () => {
      const rows = [
        createValidatedTripRow(
          12,
          'Steve Turkington',
          'GB',
          '2025-03-06',
          '2025-03-06',
          [createNonSchengenWarning(12, 'GB')]
        ),
      ];

      render(<WarningSummaryBanners rows={rows} />);

      const banner = screen.getByRole('button');
      fireEvent.click(banner);

      // Should show single date, not "2025-03-06 to 2025-03-06"
      expect(screen.getByText(/\(2025-03-06\)/)).toBeInTheDocument();
      expect(screen.queryByText(/to 2025-03-06/)).not.toBeInTheDocument();
    });
  });

  describe('mixed valid and warning rows', () => {
    test('only groups rows with warnings, ignores valid rows', () => {
      const rows = [
        // Valid Schengen trips
        createValidatedTripRow(1, 'John Doe', 'DE', '2025-01-01', '2025-01-05'),
        createValidatedTripRow(2, 'John Doe', 'FR', '2025-01-10', '2025-01-15'),
        // Non-Schengen trips with warnings
        createValidatedTripRow(
          3,
          'John Doe',
          'GB',
          '2025-02-01',
          '2025-02-05',
          [createNonSchengenWarning(3, 'GB')]
        ),
        createValidatedTripRow(
          4,
          'John Doe',
          'IE',
          '2025-03-01',
          '2025-03-05',
          [createNonSchengenWarning(4, 'IE')]
        ),
      ];

      render(<WarningSummaryBanners rows={rows} />);

      // Should show 2 trips (only the warning rows)
      expect(screen.getByText(/2 trips to non-Schengen countries/i)).toBeInTheDocument();
    });
  });

  describe('real-world scenario from screenshot', () => {
    test('groups multiple non-Schengen trips for same employee', () => {
      const rows = [
        // Steve Turkington's trips from the screenshot
        createValidatedTripRow(
          12,
          'Steve Turkington',
          'GB',
          '2025-02-10',
          '2025-02-13',
          [createNonSchengenWarning(12, 'GB')]
        ),
        createValidatedTripRow(
          12,
          'Steve Turkington',
          'GB',
          '2025-02-16',
          '2025-02-20',
          [createNonSchengenWarning(12, 'GB')]
        ),
        createValidatedTripRow(
          12,
          'Steve Turkington',
          'GB',
          '2025-03-06',
          '2025-03-06',
          [createNonSchengenWarning(12, 'GB')]
        ),
        createValidatedTripRow(
          12,
          'Steve Turkington',
          'IE',
          '2025-04-06',
          '2025-04-15',
          [createNonSchengenWarning(12, 'IE')]
        ),
      ];

      render(<WarningSummaryBanners rows={rows} />);

      // Should group all 4 trips into one banner
      expect(screen.getByText(/4 trips to non-Schengen countries/i)).toBeInTheDocument();
      // Should show both countries
      expect(screen.getByText(/\(GB, IE\)/)).toBeInTheDocument();

      // Expand and verify all rows are listed
      const banner = screen.getByRole('button');
      fireEvent.click(banner);

      // All 4 trips should be listed
      const rowTexts = screen.getAllByText(/Row 12/);
      expect(rowTexts).toHaveLength(4);
    });
  });
});
