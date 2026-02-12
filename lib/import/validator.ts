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
import { parseISO, isValid, isBefore, subYears } from 'date-fns';
import { toCountryCode } from './country-codes';

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
    } else if ((format === 'trips' || format === 'gantt') && isParsedTripRow(row)) {
      validateTripRow(row, errors, warnings, {
        requireEmail: format === 'trips',
        requireEmployeeName: format === 'gantt',
      });
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
  const namePattern = /^[\p{L}\s\-'.]+$/u;

  // First name validation
  if (!row.first_name || row.first_name.length < 1) {
    errors.push({
      row: rowNum,
      column: 'first_name',
      value: row.first_name ?? '',
      message: 'First name is required',
      severity: 'error',
    });
  } else if (row.first_name.length > 50) {
    errors.push({
      row: rowNum,
      column: 'first_name',
      value: row.first_name.substring(0, 30) + '...',
      message: 'First name must be 50 characters or less',
      severity: 'error',
    });
  } else if (!namePattern.test(row.first_name)) {
    errors.push({
      row: rowNum,
      column: 'first_name',
      value: row.first_name,
      message: "First name can only contain letters, spaces, hyphens, apostrophes, and periods",
      severity: 'error',
    });
  }

  // Last name validation
  if (!row.last_name || row.last_name.length < 1) {
    errors.push({
      row: rowNum,
      column: 'last_name',
      value: row.last_name ?? '',
      message: 'Last name is required',
      severity: 'error',
    });
  } else if (row.last_name.length > 50) {
    errors.push({
      row: rowNum,
      column: 'last_name',
      value: row.last_name.substring(0, 30) + '...',
      message: 'Last name must be 50 characters or less',
      severity: 'error',
    });
  } else if (!namePattern.test(row.last_name)) {
    errors.push({
      row: rowNum,
      column: 'last_name',
      value: row.last_name,
      message: "Last name can only contain letters, spaces, hyphens, apostrophes, and periods",
      severity: 'error',
    });
  }

  // Email validation
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!row.email || row.email.length < 1) {
    errors.push({
      row: rowNum,
      column: 'email',
      value: row.email ?? '',
      message: 'Email is required',
      severity: 'error',
    });
  } else if (!emailPattern.test(row.email)) {
    errors.push({
      row: rowNum,
      column: 'email',
      value: row.email,
      message: 'Invalid email format',
      severity: 'error',
    });
  }

  // Duplicate and existing name check (using combined name)
  if (row.first_name && row.last_name) {
    const fullName = `${row.first_name.trim()} ${row.last_name.trim()}`;
    const lowerName = fullName.toLowerCase();

    if (seenNames.has(lowerName)) {
      warnings.push({
        row: rowNum,
        column: 'first_name',
        value: fullName,
        message: 'Duplicate name in file (will create separate employee)',
        severity: 'warning',
      });
    } else {
      seenNames.add(lowerName);
    }

    if (existingNames?.has(lowerName)) {
      warnings.push({
        row: rowNum,
        column: 'first_name',
        value: fullName,
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
  warnings: ValidationError[],
  options: { requireEmail: boolean; requireEmployeeName: boolean } = {
    requireEmail: true,
    requireEmployeeName: false,
  }
): void {
  const rowNum = row.row_number;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const twoYearsAgo = subYears(today, 2);

  // Employee email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (options.requireEmail) {
    if (!row.employee_email) {
      errors.push({
        row: rowNum,
        column: 'employee_email',
        value: row.employee_email ?? '',
        message: 'Employee email is required',
        severity: 'error',
      });
    } else if (!emailRegex.test(row.employee_email)) {
      errors.push({
        row: rowNum,
        column: 'employee_email',
        value: row.employee_email,
        message: 'Invalid email format',
        severity: 'error',
      });
    }
  } else if (row.employee_email && !emailRegex.test(row.employee_email)) {
    errors.push({
      row: rowNum,
      column: 'employee_email',
      value: row.employee_email,
      message: 'Invalid email format',
      severity: 'error',
    });
  }

  // Employee name validation (Gantt)
  if (options.requireEmployeeName) {
    if (!row.employee_name || !row.employee_name.trim()) {
      errors.push({
        row: rowNum,
        column: 'employee_name',
        value: row.employee_name ?? '',
        message: 'Employee name is required',
        severity: 'error',
      });
    }
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

  // Country validation - convert name to ISO code first
  if (!row.country) {
    errors.push({
      row: rowNum,
      column: 'country',
      value: row.country,
      message: 'Country is required',
      severity: 'error',
    });
  } else {
    // Convert country name (in any supported language) to ISO code
    const countryCode = toCountryCode(row.country);

    if (!countryCode) {
      errors.push({
        row: rowNum,
        column: 'country',
        value: row.country,
        message: `Unrecognized country: "${row.country}". Use a 2-letter country code (e.g., DE, FR) or country name in English, French, German, or Spanish.`,
        severity: 'error',
      });
    } else if (NON_SCHENGEN_EU.has(countryCode)) {
      // Non-Schengen trips are valid imports; they are recorded but excluded
      // from Schengen 90/180 calculations. Surface this in preview as advisory UI.
      row.country = countryCode;
    } else if (!SCHENGEN_COUNTRIES.has(countryCode)) {
      errors.push({
        row: rowNum,
        column: 'country',
        value: row.country,
        message: `Unrecognized country: "${row.country}". Use a 2-letter country code (e.g., DE, FR) or country name in English, French, German, or Spanish.`,
        severity: 'error',
      });
    } else {
      // Valid Schengen country - store the converted code
      row.country = countryCode;
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
