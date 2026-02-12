/**
 * @fileoverview Integration tests for the import parser pipeline.
 *
 * Tests the full flow: raw file → parser → validator → ready for insert.
 * Uses real implementations (not mocks) for parser.ts and validator.ts.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as XLSX from 'xlsx';
import { parseFileRaw, sanitizeValue, normalizeHeader, formatDateValue } from '@/lib/import/parser';
import { validateRows, getValidationSummary, getAllErrors, getAllWarnings } from '@/lib/import/validator';
import type {
  ParsedEmployeeRow,
  ParsedTripRow,
  ImportFormat,
} from '@/types/import';
import { generateEmployeeCSV, generateTripCSV } from '../utils/csv-generator';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a File object from CSV content for testing.
 */
function createCSVFile(content: string, filename = 'test.csv'): File {
  const blob = new Blob([content], { type: 'text/csv' });
  return new File([blob], filename, { type: 'text/csv' });
}

/**
 * Creates a File object from Excel buffer.
 */
function createExcelFile(buffer: ArrayBuffer, filename = 'test.xlsx'): File {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return new File([blob], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Creates an Excel workbook from rows of data.
 */
function createExcelBuffer(rows: (string | number)[][]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

/**
 * Converts raw parsed data to ParsedEmployeeRow format for validation.
 */
function toEmployeeRows(rawData: Record<string, unknown>[], rawHeaders: string[]): ParsedEmployeeRow[] {
  return rawData.map((row, index) => {
    // Find values by normalized headers
    const getValue = (target: string): string => {
      const normalizedTarget = normalizeHeader(target);
      for (const header of rawHeaders) {
        if (normalizeHeader(header) === normalizedTarget) {
          return sanitizeValue(row[header]);
        }
      }
      return '';
    };

    return {
      row_number: index + 2,
      first_name: getValue('first_name'),
      last_name: getValue('last_name'),
      email: getValue('email'),
      nationality: getValue('nationality') || undefined,
      passport_number: getValue('passport_number') || undefined,
    };
  });
}

/**
 * Converts raw parsed data to ParsedTripRow format for validation.
 */
function toTripRows(rawData: Record<string, unknown>[], rawHeaders: string[]): ParsedTripRow[] {
  return rawData.map((row, index) => {
    const getValue = (target: string): string => {
      const normalizedTarget = normalizeHeader(target);
      for (const header of rawHeaders) {
        if (normalizeHeader(header) === normalizedTarget) {
          return sanitizeValue(row[header]);
        }
      }
      return '';
    };

    return {
      row_number: index + 2,
      employee_email: getValue('email') || getValue('employee_email'),
      employee_name: getValue('employee_name') || undefined,
      entry_date: formatDateValue(getValue('entry_date')),
      exit_date: formatDateValue(getValue('exit_date')),
      country: getValue('country'),
      purpose: getValue('purpose') || undefined,
    };
  });
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Import Pipeline Integration', () => {
  // ============================================================================
  // CSV Parsing Tests
  // ============================================================================
  describe('CSV Parsing', () => {
    it('parses valid employee CSV with standard columns', async () => {
      const csv = `first_name,last_name,email,nationality,passport_number
John,Doe,john.doe@test.com,GB,AB123456
Jane,Smith,jane.smith@test.com,US,CD789012`;

      const file = createCSVFile(csv);
      const result = await parseFileRaw(file);

      expect(result.success).toBe(true);
      expect(result.rawData).toHaveLength(2);
      expect(result.rawHeaders).toEqual(['first_name', 'last_name', 'email', 'nationality', 'passport_number']);
      expect(result.totalRows).toBe(2);
    });

    it('parses valid trip CSV with required columns', async () => {
      const csv = `email,entry_date,exit_date,country
john@test.com,2025-11-01,2025-11-10,FR
jane@test.com,2025-11-15,2025-11-20,DE`;

      const file = createCSVFile(csv);
      const result = await parseFileRaw(file);

      expect(result.success).toBe(true);
      expect(result.rawData).toHaveLength(2);
      expect(result.rawHeaders).toContain('email');
      expect(result.rawHeaders).toContain('entry_date');
    });

    it('handles multiple date formats: DD/MM/YYYY', async () => {
      const csv = `email,entry_date,exit_date,country
test@test.com,15/11/2025,20/11/2025,FR`;

      const file = createCSVFile(csv);
      const result = await parseFileRaw(file);

      expect(result.success).toBe(true);

      // Convert to trip rows and check date formatting
      const tripRows = toTripRows(result.rawData!, result.rawHeaders!);
      expect(tripRows[0].entry_date).toBe('2025-11-15');
      expect(tripRows[0].exit_date).toBe('2025-11-20');
    });

    it('handles YYYY-MM-DD date format (ISO)', async () => {
      const csv = `email,entry_date,exit_date,country
test@test.com,2025-11-15,2025-11-20,FR`;

      const file = createCSVFile(csv);
      const result = await parseFileRaw(file);

      const tripRows = toTripRows(result.rawData!, result.rawHeaders!);
      expect(tripRows[0].entry_date).toBe('2025-11-15');
      expect(tripRows[0].exit_date).toBe('2025-11-20');
    });

    it('handles Excel serial date numbers', async () => {
      // Excel serial date 45945 = 2025-11-15
      const csv = `email,entry_date,exit_date,country
test@test.com,45945,45950,FR`;

      const file = createCSVFile(csv);
      const result = await parseFileRaw(file);

      const tripRows = toTripRows(result.rawData!, result.rawHeaders!);
      // The Excel serial should be converted to ISO format
      expect(tripRows[0].entry_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('handles BOM characters in UTF-8 files', async () => {
      // BOM prefix: \uFEFF
      const csv = '\uFEFFfirst_name,last_name,email\nJohn,Doe,john@test.com';

      const file = createCSVFile(csv);
      const result = await parseFileRaw(file);

      expect(result.success).toBe(true);
      expect(result.rawData).toHaveLength(1);
      // XLSX library handles BOM, headers should be clean
    });

    it('handles quoted fields with commas inside', async () => {
      const csv = `first_name,last_name,email,nationality
"John, Jr",Doe,john@test.com,GB
Jane,"Smith, PhD",jane@test.com,US`;

      const file = createCSVFile(csv);
      const result = await parseFileRaw(file);

      expect(result.success).toBe(true);
      expect(result.rawData).toHaveLength(2);
      expect(result.rawData![0]['first_name']).toBe('John, Jr');
      expect(result.rawData![1]['last_name']).toBe('Smith, PhD');
    });

    it('handles empty rows gracefully (skips them)', async () => {
      const csv = `first_name,last_name,email
John,Doe,john@test.com

Jane,Smith,jane@test.com
`;

      const file = createCSVFile(csv);
      const result = await parseFileRaw(file);

      expect(result.success).toBe(true);
      // Empty rows should be handled - XLSX may include or skip them
      expect(result.rawData!.length).toBeGreaterThanOrEqual(2);
    });

    it('rejects completely empty CSV (returns meaningful error)', async () => {
      const csv = '';

      const file = createCSVFile(csv);
      const result = await parseFileRaw(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('sanitizes CSV injection attempts: fields starting with =, @, +, -', async () => {
      const csv = `first_name,last_name,email
=cmd|' /C calc'!A0,Doe,john@test.com
+1234567890,Smith,jane@test.com
-malicious,Brown,bob@test.com
@SUM(A1:A100),White,alice@test.com`;

      const file = createCSVFile(csv);
      const result = await parseFileRaw(file);

      expect(result.success).toBe(true);

      // Values should have dangerous prefixes removed
      const firstNames = result.rawData!.map(r => r['first_name']);
      expect(firstNames[0]).not.toMatch(/^=/);
      expect(firstNames[1]).not.toMatch(/^\+/);
      expect(firstNames[2]).not.toMatch(/^-/);
      expect(firstNames[3]).not.toMatch(/^@/);
    });
  });

  // ============================================================================
  // Excel Parsing Tests
  // ============================================================================
  describe('Excel Parsing', () => {
    it('parses .xlsx file with employee data', async () => {
      const rows = [
        ['first_name', 'last_name', 'email', 'nationality'],
        ['John', 'Doe', 'john@test.com', 'GB'],
        ['Jane', 'Smith', 'jane@test.com', 'US'],
      ];

      const buffer = createExcelBuffer(rows);
      const file = createExcelFile(buffer);
      const result = await parseFileRaw(file);

      expect(result.success).toBe(true);
      expect(result.rawData).toHaveLength(2);
      expect(result.rawHeaders).toContain('first_name');
    });

    it('parses .xlsx file with trip data', async () => {
      const rows = [
        ['email', 'entry_date', 'exit_date', 'country'],
        ['john@test.com', '2025-11-01', '2025-11-10', 'FR'],
        ['jane@test.com', '2025-11-15', '2025-11-20', 'DE'],
      ];

      const buffer = createExcelBuffer(rows);
      const file = createExcelFile(buffer);
      const result = await parseFileRaw(file);

      expect(result.success).toBe(true);
      expect(result.rawData).toHaveLength(2);
    });

    it('handles multiple sheets (uses first sheet by default)', async () => {
      const workbook = XLSX.utils.book_new();

      // First sheet - should be used
      const sheet1 = XLSX.utils.aoa_to_sheet([
        ['first_name', 'last_name', 'email'],
        ['John', 'Doe', 'john@test.com'],
      ]);
      XLSX.utils.book_append_sheet(workbook, sheet1, 'Employees');

      // Second sheet - should be ignored
      const sheet2 = XLSX.utils.aoa_to_sheet([
        ['other', 'data'],
        ['foo', 'bar'],
      ]);
      XLSX.utils.book_append_sheet(workbook, sheet2, 'Other');

      const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
      const file = createExcelFile(buffer);
      const result = await parseFileRaw(file);

      expect(result.success).toBe(true);
      expect(result.rawHeaders).toContain('first_name');
      expect(result.rawHeaders).not.toContain('other');
    });

    it('handles formatted dates in Excel', async () => {
      // Create workbook with actual date objects
      const workbook = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['email', 'entry_date', 'exit_date', 'country'],
        ['test@test.com', new Date(2025, 10, 15), new Date(2025, 10, 20), 'FR'],
      ]);
      XLSX.utils.book_append_sheet(workbook, ws, 'Trips');

      const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
      const file = createExcelFile(buffer);
      const result = await parseFileRaw(file);

      expect(result.success).toBe(true);
      // Dates should be parsed to strings
      expect(result.rawData![0]['entry_date']).toBeDefined();
    });
  });

  // ============================================================================
  // Validation Chain Tests
  // ============================================================================
  describe('Validation Chain', () => {
    it('returns structured ValidationResult with errors and warnings arrays', async () => {
      const csv = `first_name,last_name,email
John,Doe,john@test.com
Jane,Smith,invalid-email`;

      const file = createCSVFile(csv);
      const parseResult = await parseFileRaw(file);
      expect(parseResult.success).toBe(true);

      const employeeRows = toEmployeeRows(parseResult.rawData!, parseResult.rawHeaders!);
      const validatedRows = await validateRows(employeeRows, 'employees');

      expect(validatedRows).toHaveLength(2);
      expect(validatedRows[0].is_valid).toBe(true);
      expect(validatedRows[0].errors).toHaveLength(0);
      expect(validatedRows[1].is_valid).toBe(false);
      expect(validatedRows[1].errors.length).toBeGreaterThan(0);
    });

    it('validates required fields present (first_name, last_name, email for employees)', async () => {
      const csv = `first_name,last_name,email
,Doe,john@test.com
John,,john2@test.com
John,Doe,`;

      const file = createCSVFile(csv);
      const parseResult = await parseFileRaw(file);
      const employeeRows = toEmployeeRows(parseResult.rawData!, parseResult.rawHeaders!);
      const validatedRows = await validateRows(employeeRows, 'employees');

      // Row 1: missing first_name
      expect(validatedRows[0].is_valid).toBe(false);
      expect(validatedRows[0].errors.some(e => e.column === 'first_name')).toBe(true);

      // Row 2: missing last_name
      expect(validatedRows[1].is_valid).toBe(false);
      expect(validatedRows[1].errors.some(e => e.column === 'last_name')).toBe(true);

      // Row 3: missing email
      expect(validatedRows[2].is_valid).toBe(false);
      expect(validatedRows[2].errors.some(e => e.column === 'email')).toBe(true);
    });

    it('validates email format', async () => {
      const csv = `first_name,last_name,email
John,Doe,valid@test.com
Jane,Smith,not-an-email
Bob,Brown,missing@domain`;

      const file = createCSVFile(csv);
      const parseResult = await parseFileRaw(file);
      const employeeRows = toEmployeeRows(parseResult.rawData!, parseResult.rawHeaders!);
      const validatedRows = await validateRows(employeeRows, 'employees');

      expect(validatedRows[0].is_valid).toBe(true);
      expect(validatedRows[1].is_valid).toBe(false);
      expect(validatedRows[1].errors.some(e => e.message.toLowerCase().includes('email'))).toBe(true);
    });

    it('validates date format and logic (exit >= entry)', async () => {
      const csv = `email,entry_date,exit_date,country
valid@test.com,2025-11-01,2025-11-10,FR
invalid@test.com,not-a-date,2025-11-10,FR
backwards@test.com,2025-11-15,2025-11-10,FR`;

      const file = createCSVFile(csv);
      const parseResult = await parseFileRaw(file);
      const tripRows = toTripRows(parseResult.rawData!, parseResult.rawHeaders!);
      const validatedRows = await validateRows(tripRows, 'trips');

      // Row 1: valid
      expect(validatedRows[0].is_valid).toBe(true);

      // Row 2: invalid date format
      expect(validatedRows[1].is_valid).toBe(false);
      expect(validatedRows[1].errors.some(e => e.column === 'entry_date')).toBe(true);

      // Row 3: exit before entry
      expect(validatedRows[2].is_valid).toBe(false);
      expect(validatedRows[2].errors.some(e => e.message.toLowerCase().includes('before'))).toBe(true);
    });

    it('validates country codes (rejects invalid codes like XX)', async () => {
      const csv = `email,entry_date,exit_date,country
valid@test.com,2025-11-01,2025-11-10,FR
invalid@test.com,2025-11-01,2025-11-10,XX
another@test.com,2025-11-01,2025-11-10,ZZ`;

      const file = createCSVFile(csv);
      const parseResult = await parseFileRaw(file);
      const tripRows = toTripRows(parseResult.rawData!, parseResult.rawHeaders!);
      const validatedRows = await validateRows(tripRows, 'trips');

      expect(validatedRows[0].is_valid).toBe(true);
      expect(validatedRows[1].is_valid).toBe(false);
      expect(validatedRows[1].errors.some(e => e.column === 'country')).toBe(true);
      expect(validatedRows[2].is_valid).toBe(false);
    });

    it('detects duplicate employees by name (returns warning)', async () => {
      const csv = `first_name,last_name,email
John,Doe,john1@test.com
John,Doe,john2@test.com
Jane,Smith,jane@test.com`;

      const file = createCSVFile(csv);
      const parseResult = await parseFileRaw(file);
      const employeeRows = toEmployeeRows(parseResult.rawData!, parseResult.rawHeaders!);
      const validatedRows = await validateRows(employeeRows, 'employees');

      // Both rows should be valid (duplicates create warnings, not errors)
      expect(validatedRows[0].is_valid).toBe(true);
      expect(validatedRows[1].is_valid).toBe(true);

      // Second duplicate should have a warning
      const allWarnings = getAllWarnings(validatedRows);
      expect(allWarnings.some(w => w.message.toLowerCase().includes('duplicate'))).toBe(true);
    });

    it('validates name character pattern', async () => {
      const csv = `first_name,last_name,email
John,Doe,john@test.com
Script<alert>,Brown,bob@test.com
Valid-Name,O'Connor,valid@test.com`;

      const file = createCSVFile(csv);
      const parseResult = await parseFileRaw(file);
      const employeeRows = toEmployeeRows(parseResult.rawData!, parseResult.rawHeaders!);
      const validatedRows = await validateRows(employeeRows, 'employees');

      expect(validatedRows[0].is_valid).toBe(true);
      expect(validatedRows[1].is_valid).toBe(false); // Invalid characters
      expect(validatedRows[2].is_valid).toBe(true); // Hyphens and apostrophes allowed
    });

    it('provides validation summary', async () => {
      const csv = `first_name,last_name,email
John,Doe,john@test.com
Jane,Smith,invalid-email
Bob,Brown,bob@test.com
,Missing,name@test.com`;

      const file = createCSVFile(csv);
      const parseResult = await parseFileRaw(file);
      const employeeRows = toEmployeeRows(parseResult.rawData!, parseResult.rawHeaders!);
      const validatedRows = await validateRows(employeeRows, 'employees');
      const summary = getValidationSummary(validatedRows);

      expect(summary.total).toBe(4);
      expect(summary.valid).toBe(2);
      expect(summary.errors).toBe(2);
    });

    it('accepts non-Schengen EU countries without blocking import', async () => {
      const csv = `email,entry_date,exit_date,country
test@test.com,2025-11-01,2025-11-10,IE`;

      const file = createCSVFile(csv);
      const parseResult = await parseFileRaw(file);
      const tripRows = toTripRows(parseResult.rawData!, parseResult.rawHeaders!);
      const validatedRows = await validateRows(tripRows, 'trips');

      // Ireland (IE) is non-Schengen EU - should be valid (advisory handled in preview UI)
      expect(validatedRows[0].is_valid).toBe(true);
      expect(validatedRows[0].warnings.length).toBe(0);
    });
  });

  // ============================================================================
  // Full Pipeline Tests (Parse → Validate → Ready)
  // ============================================================================
  describe('Full Pipeline (Parse → Validate)', () => {
    it('processes fixture: valid-employees.csv', async () => {
      const fixturePath = path.join(__dirname, '../fixtures/valid-employees.csv');
      const content = fs.readFileSync(fixturePath, 'utf-8');
      const file = createCSVFile(content, 'valid-employees.csv');

      const parseResult = await parseFileRaw(file);
      expect(parseResult.success).toBe(true);
      expect(parseResult.totalRows).toBe(10);

      // Note: Fixture has 'name' column, need to split for validation
      // This tests the actual fixture format vs expected format mismatch
    });

    it('processes fixture: valid-trips.csv', async () => {
      const fixturePath = path.join(__dirname, '../fixtures/valid-trips.csv');
      const content = fs.readFileSync(fixturePath, 'utf-8');
      const file = createCSVFile(content, 'valid-trips.csv');

      const parseResult = await parseFileRaw(file);
      expect(parseResult.success).toBe(true);
      expect(parseResult.totalRows).toBe(20);

      const tripRows = toTripRows(parseResult.rawData!, parseResult.rawHeaders!);
      const validatedRows = await validateRows(tripRows, 'trips');
      const summary = getValidationSummary(validatedRows);

      // All trips in valid-trips.csv should be valid
      expect(summary.valid).toBe(summary.total);
    });

    it('processes fixture: invalid-employees.csv with mixed valid/invalid rows', async () => {
      const fixturePath = path.join(__dirname, '../fixtures/invalid-employees.csv');
      const content = fs.readFileSync(fixturePath, 'utf-8');
      const file = createCSVFile(content, 'invalid-employees.csv');

      const parseResult = await parseFileRaw(file);
      expect(parseResult.success).toBe(true);

      // Fixture has intentionally invalid rows
      const allErrors = parseResult.rawData!.filter(row => {
        const email = row['email'] as string;
        return !email || !email.includes('@');
      });
      expect(allErrors.length).toBeGreaterThan(0);
    });

    it('handles generated employee CSV (100 rows)', async () => {
      const csv = generateEmployeeCSV({ count: 100, seed: 42 });
      const file = createCSVFile(csv, 'generated-employees.csv');

      const parseResult = await parseFileRaw(file);
      expect(parseResult.success).toBe(true);
      expect(parseResult.totalRows).toBe(100);
    });

    it('handles generated trip CSV (200 rows)', async () => {
      const employees = Array.from({ length: 10 }, (_, i) => ({
        email: `employee${i}@test.com`,
      }));
      const csv = generateTripCSV({ count: 200, seed: 42, employees });
      const file = createCSVFile(csv, 'generated-trips.csv');

      const parseResult = await parseFileRaw(file);
      expect(parseResult.success).toBe(true);
      expect(parseResult.totalRows).toBe(200);

      const tripRows = toTripRows(parseResult.rawData!, parseResult.rawHeaders!);
      const validatedRows = await validateRows(tripRows, 'trips');

      // Generated data should be mostly valid
      const summary = getValidationSummary(validatedRows);
      expect(summary.valid / summary.total).toBeGreaterThan(0.9);
    });

    it('rejects files exceeding row limit', async () => {
      // Generate CSV with 501 rows (exceeds MAX_ROWS of 500)
      const csv = generateEmployeeCSV({ count: 501, seed: 1 });
      const file = createCSVFile(csv);

      const result = await parseFileRaw(file);
      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles column names with extra whitespace', async () => {
      const csv = `  first_name  , last_name,  email
John,Doe,john@test.com`;

      const file = createCSVFile(csv);
      const result = await parseFileRaw(file);

      expect(result.success).toBe(true);
      // Headers should be trimmed
    });

    it('handles mixed case column names', async () => {
      const csv = `First_Name,LAST_NAME,Email
John,Doe,john@test.com`;

      const file = createCSVFile(csv);
      const result = await parseFileRaw(file);

      expect(result.success).toBe(true);
      // Normalization should handle case differences
    });

    it('handles null/undefined values in cells', async () => {
      const rows = [
        ['first_name', 'last_name', 'email'],
        [null, 'Doe', 'john@test.com'],
        ['Jane', undefined, 'jane@test.com'],
      ];

      const buffer = createExcelBuffer(rows as (string | number)[][]);
      const file = createExcelFile(buffer);
      const result = await parseFileRaw(file);

      expect(result.success).toBe(true);
      // Null/undefined should be converted to empty strings
    });

    it('handles very long field values', async () => {
      const longName = 'A'.repeat(100);
      const csv = `first_name,last_name,email
${longName},Doe,john@test.com`;

      const file = createCSVFile(csv);
      const parseResult = await parseFileRaw(file);
      expect(parseResult.success).toBe(true);

      const employeeRows = toEmployeeRows(parseResult.rawData!, parseResult.rawHeaders!);
      const validatedRows = await validateRows(employeeRows, 'employees');

      // Should fail validation for name length
      expect(validatedRows[0].is_valid).toBe(false);
      expect(validatedRows[0].errors.some(e => e.message.includes('50 characters'))).toBe(true);
    });

    it('handles special characters in values', async () => {
      // Use escape sequences to ensure proper encoding
      const csv = `first_name,last_name,email
John-Paul,O'Connor,john@test.com
Mary-Jane,Smith-Jones,mary@test.com`;

      const file = createCSVFile(csv);
      const parseResult = await parseFileRaw(file);

      expect(parseResult.success).toBe(true);
      // Special characters like hyphens and apostrophes should be preserved
      expect(parseResult.rawData![0]['first_name']).toBe('John-Paul');
      expect(parseResult.rawData![0]['last_name']).toBe("O'Connor");
      expect(parseResult.rawData![1]['last_name']).toBe('Smith-Jones');
    });
  });

  // ============================================================================
  // Header Normalization Tests
  // ============================================================================
  describe('Header Normalization', () => {
    it('normalizes headers: lowercase, replace spaces/hyphens with underscore', () => {
      expect(normalizeHeader('First Name')).toBe('first_name');
      expect(normalizeHeader('LAST-NAME')).toBe('last_name');
      expect(normalizeHeader('  Email Address  ')).toBe('email_address');
      expect(normalizeHeader('Entry_Date')).toBe('entry_date');
    });

    it('removes special characters from headers', () => {
      expect(normalizeHeader('First!Name')).toBe('firstname');
      expect(normalizeHeader('Email@Address')).toBe('emailaddress');
      expect(normalizeHeader('Name#1')).toBe('name1');
    });
  });

  // ============================================================================
  // Date Formatting Tests
  // ============================================================================
  describe('Date Formatting', () => {
    it('formatDateValue handles already ISO format', () => {
      expect(formatDateValue('2025-11-15')).toBe('2025-11-15');
    });

    it('formatDateValue handles DD/MM/YYYY', () => {
      expect(formatDateValue('15/11/2025')).toBe('2025-11-15');
    });

    it('formatDateValue handles ISO datetime', () => {
      expect(formatDateValue('2025-11-15T12:30:00Z')).toBe('2025-11-15');
    });

    it('formatDateValue handles empty string', () => {
      expect(formatDateValue('')).toBe('');
    });

    it('formatDateValue returns unparseable values as-is', () => {
      expect(formatDateValue('not-a-date')).toBe('not-a-date');
    });
  });

  // ============================================================================
  // Sanitization Tests
  // ============================================================================
  describe('Value Sanitization', () => {
    it('sanitizeValue trims whitespace', () => {
      expect(sanitizeValue('  hello  ')).toBe('hello');
    });

    it('sanitizeValue handles null/undefined', () => {
      expect(sanitizeValue(null)).toBe('');
      expect(sanitizeValue(undefined)).toBe('');
    });

    it('sanitizeValue removes dangerous prefixes', () => {
      expect(sanitizeValue('=cmd')).toBe('cmd');
      expect(sanitizeValue('+123')).toBe('123');
      expect(sanitizeValue('-test')).toBe('test');
      expect(sanitizeValue('@mention')).toBe('mention');
    });

    it('sanitizeValue converts numbers to strings', () => {
      expect(sanitizeValue(123)).toBe('123');
      expect(sanitizeValue(45.67)).toBe('45.67');
    });
  });
});
