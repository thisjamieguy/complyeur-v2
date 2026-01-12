import { z } from 'zod';

// ============================================================
// ENUMS & CONSTANTS
// ============================================================

export const IMPORT_FORMATS = ['employees', 'trips', 'gantt'] as const;
export type ImportFormat = (typeof IMPORT_FORMATS)[number];

export const IMPORT_STATUSES = [
  'pending',
  'parsing',
  'validating',
  'ready',
  'importing',
  'completed',
  'failed',
] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_ROWS = 500;
export const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'] as const;
export const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
] as const;

// ============================================================
// TEMPLATE COLUMN DEFINITIONS (STRICT MODE)
// Adapted for existing employees table which only has 'name'
// ============================================================

export const EMPLOYEE_COLUMNS = ['name'] as const;

export const TRIP_COLUMNS = [
  'employee_name',
  'entry_date',
  'exit_date',
  'country',
  'purpose',
] as const;

// ============================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================

export const EmployeeRowSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be 100 characters or less'),
});

export const TripRowSchema = z.object({
  employee_name: z.string().min(2, 'Employee name is required'),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  exit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  country: z.string().min(2, 'Country is required'),
  purpose: z.string().max(200).optional(),
});

// ============================================================
// PARSED DATA TYPES
// ============================================================

export interface ParsedEmployeeRow {
  row_number: number;
  name: string;
}

export interface ParsedTripRow {
  row_number: number;
  employee_name: string;
  entry_date: string;
  exit_date: string;
  country: string;
  purpose?: string;
}

export type ParsedRow = ParsedEmployeeRow | ParsedTripRow;

// Type guards
export function isParsedEmployeeRow(row: ParsedRow): row is ParsedEmployeeRow {
  return 'name' in row && !('employee_name' in row);
}

export function isParsedTripRow(row: ParsedRow): row is ParsedTripRow {
  return 'employee_name' in row;
}

// ============================================================
// VALIDATION TYPES
// ============================================================

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationError {
  row: number;
  column: string;
  value: string;
  message: string;
  severity: ValidationSeverity;
}

export interface ValidatedRow<T extends ParsedRow> {
  row_number: number;
  data: T;
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ============================================================
// IMPORT SESSION TYPES
// ============================================================

export interface ImportSession {
  id: string;
  company_id: string;
  user_id: string;
  format: ImportFormat;
  status: ImportStatus;
  file_name: string;
  file_size: number;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  parsed_data: ParsedRow[] | null;
  validation_errors: ValidationError[];
  result: ImportResult | null;
  created_at: string;
  completed_at: string | null;
}

export interface ImportResult {
  success: boolean;
  employees_created: number;
  employees_updated: number;
  trips_created: number;
  trips_skipped: number;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ============================================================
// FORMAT CARD DATA
// ============================================================

export interface FormatOption {
  id: ImportFormat;
  title: string;
  description: string;
  columns: readonly string[];
  templateUrl: string;
  icon: 'users' | 'plane' | 'calendar';
}

export const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'employees',
    title: 'Employees Only',
    description: 'Import employee records with names. Creates new employees in your company.',
    columns: EMPLOYEE_COLUMNS,
    templateUrl: '/templates/employees-template.csv',
    icon: 'users',
  },
  {
    id: 'trips',
    title: 'Simple Trip List',
    description: 'Import trips with employee name, dates, and destination country.',
    columns: TRIP_COLUMNS,
    templateUrl: '/templates/trips-template.csv',
    icon: 'plane',
  },
  {
    id: 'gantt',
    title: 'Schedule/Gantt',
    description: 'Import from schedule format with employees as rows and dates as columns.',
    columns: ['employee_name', 'dates...'],
    templateUrl: '/templates/gantt-template.csv',
    icon: 'calendar',
  },
];

// ============================================================
// SCHENGEN COUNTRIES
// ============================================================

export const SCHENGEN_COUNTRIES = new Set([
  // Two-letter codes
  'AT', 'BE', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IS', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO',
  'PL', 'PT', 'SK', 'SI', 'ES', 'SE', 'CH',
  // Full names (uppercase)
  'AUSTRIA', 'BELGIUM', 'CROATIA', 'CZECHIA', 'CZECH REPUBLIC',
  'DENMARK', 'ESTONIA', 'FINLAND', 'FRANCE', 'GERMANY', 'GREECE',
  'HUNGARY', 'ICELAND', 'ITALY', 'LATVIA', 'LIECHTENSTEIN',
  'LITHUANIA', 'LUXEMBOURG', 'MALTA', 'NETHERLANDS', 'NORWAY',
  'POLAND', 'PORTUGAL', 'SLOVAKIA', 'SLOVENIA', 'SPAIN', 'SWEDEN',
  'SWITZERLAND',
]);

export const NON_SCHENGEN_EU = new Set([
  'IE', 'IRELAND', 'CY', 'CYPRUS', 'GB', 'UK', 'UNITED KINGDOM',
  'BG', 'BULGARIA', 'RO', 'ROMANIA',
]);

// ============================================================
// HELPER TYPES
// ============================================================

export interface ParseResult {
  success: boolean;
  data?: ParsedRow[];
  headers?: string[];
  error?: string;
  totalRows?: number;
}

export interface UploadResult {
  success: boolean;
  session?: ImportSession;
  error?: string;
}

export interface ValidationSummary {
  total: number;
  valid: number;
  errors: number;
  warnings: number;
}
