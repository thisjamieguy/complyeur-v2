import {
  ParsedEmployeeRow,
  ParsedTripRow,
  ParsedRow,
  ValidationError,
  ValidatedRow,
  ImportFormat,
  SCHENGEN_COUNTRIES,
  NON_SCHENGEN_EU,
  ValidationSummary,
  isParsedEmployeeRow,
  isParsedTripRow,
} from '@/types/import';
import { parseISO, isValid, isBefore, isAfter, addDays, subYears } from 'date-fns';

// ============================================================
// VALIDATE ALL ROWS
// ============================================================

export async function validateRows<T extends ParsedRow>(
  rows: T[],
  format: ImportFormat,
  existingNames?: Set<string>
): Promise<ValidatedRow<T>[]> {
  const seenNames = new Set<string>();
  const results: ValidatedRow<T>[] = [];

  for (const row of rows) {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (format === 'employees' && isParsedEmployeeRow(row)) {
      validateEmployeeRow(row, errors, warnings, seenNames, existingNames);
    } else if (format === 'trips' && isParsedTripRow(row)) {
      validateTripRow(row, errors, warnings);
    }

    results.push({
      row_number: row.row_number,
      data: row,
      is_valid: errors.length === 0,
      errors,
      warnings,
    });
  }

  return results;
}

// ============================================================
// VALIDATE EMPLOYEE ROW
// ============================================================

function validateEmployeeRow(
  row: ParsedEmployeeRow,
  errors: ValidationError[],
  warnings: ValidationError[],
  seenNames: Set<string>,
  existingNames?: Set<string>
): void {
  const rowNum = row.row_number;

  // Name validation
  if (!row.name || row.name.length < 2) {
    errors.push({
      row: rowNum,
      column: 'name',
      value: row.name,
      message: 'Name is required (2-100 characters)',
      severity: 'error',
    });
  } else if (row.name.length > 100) {
    errors.push({
      row: rowNum,
      column: 'name',
      value: row.name.substring(0, 50) + '...',
      message: 'Name must be 100 characters or less',
      severity: 'error',
    });
  } else {
    // Check for invalid characters (allow letters, spaces, hyphens, apostrophes, periods)
    if (!/^[a-zA-Z\s\-'.]+$/.test(row.name)) {
      errors.push({
        row: rowNum,
        column: 'name',
        value: row.name,
        message: "Name can only contain letters, spaces, hyphens, apostrophes, and periods",
        severity: 'error',
      });
    }

    // Check for duplicates in the file
    const lowerName = row.name.toLowerCase().trim();
    if (seenNames.has(lowerName)) {
      warnings.push({
        row: rowNum,
        column: 'name',
        value: row.name,
        message: 'Duplicate name in file (will create separate employee)',
        severity: 'warning',
      });
    } else {
      seenNames.add(lowerName);
    }

    // Check if employee already exists
    if (existingNames?.has(lowerName)) {
      warnings.push({
        row: rowNum,
        column: 'name',
        value: row.name,
        message: 'Employee with this name already exists (will be skipped)',
        severity: 'warning',
      });
    }
  }
}

// ============================================================
// VALIDATE TRIP ROW
// ============================================================

function validateTripRow(
  row: ParsedTripRow,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  const rowNum = row.row_number;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const twoYearsAgo = subYears(today, 2);
  const sevenDaysFromNow = addDays(today, 7);

  // Employee name validation
  if (!row.employee_name || row.employee_name.length < 2) {
    errors.push({
      row: rowNum,
      column: 'employee_name',
      value: row.employee_name,
      message: 'Employee name is required',
      severity: 'error',
    });
  }

  // Entry date validation
  let entryDate: Date | null = null;
  if (!row.entry_date) {
    errors.push({
      row: rowNum,
      column: 'entry_date',
      value: row.entry_date,
      message: 'Entry date is required',
      severity: 'error',
    });
  } else {
    entryDate = parseISO(row.entry_date);
    if (!isValid(entryDate)) {
      errors.push({
        row: rowNum,
        column: 'entry_date',
        value: row.entry_date,
        message: 'Invalid date format. Use YYYY-MM-DD',
        severity: 'error',
      });
    } else if (isBefore(entryDate, twoYearsAgo)) {
      errors.push({
        row: rowNum,
        column: 'entry_date',
        value: row.entry_date,
        message: 'Entry date cannot be more than 2 years in the past',
        severity: 'error',
      });
    }
  }

  // Exit date validation
  let exitDate: Date | null = null;
  if (!row.exit_date) {
    errors.push({
      row: rowNum,
      column: 'exit_date',
      value: row.exit_date,
      message: 'Exit date is required',
      severity: 'error',
    });
  } else {
    exitDate = parseISO(row.exit_date);
    if (!isValid(exitDate)) {
      errors.push({
        row: rowNum,
        column: 'exit_date',
        value: row.exit_date,
        message: 'Invalid date format. Use YYYY-MM-DD',
        severity: 'error',
      });
    } else if (isAfter(exitDate, sevenDaysFromNow)) {
      warnings.push({
        row: rowNum,
        column: 'exit_date',
        value: row.exit_date,
        message: 'Exit date is in the future. This trip will be marked as upcoming.',
        severity: 'warning',
      });
    }
  }

  // Date range validation
  if (entryDate && exitDate && isValid(entryDate) && isValid(exitDate)) {
    if (isBefore(exitDate, entryDate)) {
      errors.push({
        row: rowNum,
        column: 'exit_date',
        value: row.exit_date,
        message: 'Exit date cannot be before entry date',
        severity: 'error',
      });
    }
  }

  // Country validation
  if (!row.country) {
    errors.push({
      row: rowNum,
      column: 'country',
      value: row.country,
      message: 'Country is required',
      severity: 'error',
    });
  } else {
    const countryUpper = row.country.toUpperCase().trim();

    if (NON_SCHENGEN_EU.has(countryUpper)) {
      warnings.push({
        row: rowNum,
        column: 'country',
        value: row.country,
        message: `${row.country} is not a Schengen country. This trip will not count towards the 90/180 rule but will still be recorded.`,
        severity: 'warning',
      });
    } else if (!SCHENGEN_COUNTRIES.has(countryUpper)) {
      errors.push({
        row: rowNum,
        column: 'country',
        value: row.country,
        message: `Unrecognized country: "${row.country}". Use a 2-letter country code (e.g., DE, FR) or full country name.`,
        severity: 'error',
      });
    }
  }

  // Purpose validation (optional but check length)
  if (row.purpose && row.purpose.length > 200) {
    errors.push({
      row: rowNum,
      column: 'purpose',
      value: row.purpose.substring(0, 50) + '...',
      message: 'Purpose must be 200 characters or less',
      severity: 'error',
    });
  }
}

// ============================================================
// SUMMARY HELPERS
// ============================================================

export function getValidationSummary(rows: ValidatedRow<ParsedRow>[]): ValidationSummary {
  return {
    total: rows.length,
    valid: rows.filter((r) => r.is_valid).length,
    errors: rows.filter((r) => !r.is_valid).length,
    warnings: rows.filter((r) => r.warnings.length > 0).length,
  };
}

// ============================================================
// GET ALL ERRORS/WARNINGS FLATTENED
// ============================================================

export function getAllErrors(rows: ValidatedRow<ParsedRow>[]): ValidationError[] {
  return rows.flatMap((r) => r.errors);
}

export function getAllWarnings(rows: ValidatedRow<ParsedRow>[]): ValidationError[] {
  return rows.flatMap((r) => r.warnings);
}
