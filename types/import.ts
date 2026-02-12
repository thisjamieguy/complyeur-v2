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
export const MAX_GANTT_TRIPS = 5000;
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
  employee_email: z.string().email('Invalid email format'),
  employee_name: z.string().optional(),
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
  first_name: string;
  last_name: string;
  email: string;
  nationality?: string;
  passport_number?: string;
}

export interface ParsedTripRow {
  row_number: number;
  employee_email: string;
  employee_name?: string;
  entry_date: string;
  exit_date: string;
  country: string;
  purpose?: string;
  // Fields added for Gantt-generated trips
  _generated?: boolean;
  _dayCount?: number;
  _isSchengen?: boolean;
}

export type ParsedRow = ParsedEmployeeRow | ParsedTripRow;

// Type guards
export function isParsedEmployeeRow(row: ParsedRow): row is ParsedEmployeeRow {
  return 'first_name' in row && 'last_name' in row && 'email' in row && !('employee_name' in row);
}

export function isParsedTripRow(row: ParsedRow): row is ParsedTripRow {
  return 'entry_date' in row && 'exit_date' in row;
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
// DUPLICATE HANDLING OPTIONS
// ============================================================

export type DuplicateHandlingMode = 'skip' | 'update';
export type EmployeeNameConflictMode = 'new_employee' | 'same_employee' | 'rename';

export interface DuplicateOptions {
  /** How to handle employees that already exist (matched by email) */
  employees: DuplicateHandlingMode;
  /** How to handle trips that already exist (matched by employee + dates) */
  trips: DuplicateHandlingMode;
  /**
   * How to handle duplicate employee names within the same import file.
   * - new_employee: keep duplicates as separate employees
   * - same_employee: keep first occurrence, skip later duplicates
   * - rename: auto-rename later duplicates (e.g., "Jane Doe (2)")
   */
  employee_name_conflicts?: EmployeeNameConflictMode;
}

export const DEFAULT_DUPLICATE_OPTIONS: DuplicateOptions = {
  employees: 'update',
  trips: 'skip',
  employee_name_conflicts: 'new_employee',
};

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

// ============================================================
// COLUMN MAPPING TYPES (Phase 3)
// ============================================================

// ------------------------------------------------------------
// Target Fields (what ComplyEur expects)
// ------------------------------------------------------------

export const EMPLOYEE_TARGET_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'nationality',
  'passport_number',
  'name', // For backward compatibility with existing schema
] as const;

export const TRIP_TARGET_FIELDS = [
  'employee_email',
  'employee_name', // For backward compatibility
  'entry_date',
  'exit_date',
  'country',
  'purpose',
] as const;

export type EmployeeTargetField = (typeof EMPLOYEE_TARGET_FIELDS)[number];
export type TripTargetField = (typeof TRIP_TARGET_FIELDS)[number];
export type TargetField = EmployeeTargetField | TripTargetField;

// Required fields that MUST be mapped for import to proceed
export const REQUIRED_EMPLOYEE_FIELDS: EmployeeTargetField[] = [
  'first_name',
  'last_name',
  'email',
];

export const REQUIRED_TRIP_FIELDS: TripTargetField[] = [
  'employee_email',
  'entry_date',
  'exit_date',
  'country',
];

// ------------------------------------------------------------
// Mapping Confidence Levels
// ------------------------------------------------------------

export type MappingConfidence =
  | 'auto' // Matched via exact column name or alias
  | 'saved' // Matched via saved company mapping
  | 'manual' // User manually selected this mapping
  | 'skipped' // User explicitly chose to skip this column
  | 'unmapped'; // No mapping assigned yet

// ------------------------------------------------------------
// Single Column Mapping
// ------------------------------------------------------------

export interface ColumnMapping {
  sourceColumn: string; // Original column name from file: "Mitarbeiter"
  targetField: TargetField | null; // ComplyEur field: "first_name" or null if skipped
  confidence: MappingConfidence;
  sampleValues: string[]; // First 5 non-empty values from this column
}

// ------------------------------------------------------------
// Mapping State for UI
// ------------------------------------------------------------

export interface MappingState {
  sessionId: string;
  format: ImportFormat;
  sourceColumns: string[]; // All columns from uploaded file
  mappings: ColumnMapping[]; // Current mapping for each column
  isComplete: boolean; // All required fields mapped?
  unmappedRequired: string[]; // Which required fields are still unmapped?
}

// ------------------------------------------------------------
// Saved Mapping (from database)
// ------------------------------------------------------------

export interface SavedColumnMapping {
  id: string;
  company_id: string;
  created_by: string;
  name: string;
  description: string | null;
  format: ImportFormat;
  mappings: Record<string, TargetField>; // { "Mitarbeiter": "first_name" }
  times_used: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------
// Zod Schemas for Validation
// ------------------------------------------------------------

export const ColumnMappingSchema = z.object({
  sourceColumn: z.string().min(1),
  targetField: z
    .enum([...EMPLOYEE_TARGET_FIELDS, ...TRIP_TARGET_FIELDS] as [string, ...string[]])
    .nullable(),
  confidence: z.enum(['auto', 'saved', 'manual', 'skipped', 'unmapped']),
  sampleValues: z.array(z.string()).max(5),
});

export const MappingStateSchema = z.object({
  sessionId: z.string().uuid(),
  format: z.enum(['employees', 'trips', 'gantt']),
  sourceColumns: z.array(z.string()),
  mappings: z.array(ColumnMappingSchema),
  isComplete: z.boolean(),
  unmappedRequired: z.array(z.string()),
});

export const SaveMappingInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  format: z.enum(['employees', 'trips', 'gantt']),
  mappings: z.record(
    z.string(),
    z.enum([...EMPLOYEE_TARGET_FIELDS, ...TRIP_TARGET_FIELDS] as [string, ...string[]])
  ),
});

// ------------------------------------------------------------
// Field Metadata (for UI display)
// ------------------------------------------------------------

export interface FieldMetadata {
  field: TargetField;
  label: string;
  description: string;
  required: boolean;
  example: string;
}

export const EMPLOYEE_FIELD_METADATA: FieldMetadata[] = [
  {
    field: 'name',
    label: 'Full Name',
    description: "Employee's full name",
    required: true,
    example: 'John Smith',
  },
  {
    field: 'first_name',
    label: 'First Name',
    description: "Employee's first/given name",
    required: false,
    example: 'John',
  },
  {
    field: 'last_name',
    label: 'Last Name',
    description: "Employee's last/family name",
    required: false,
    example: 'Smith',
  },
  {
    field: 'email',
    label: 'Email',
    description: 'Work email address',
    required: false,
    example: 'john.smith@company.com',
  },
  {
    field: 'nationality',
    label: 'Nationality',
    description: 'Two-letter country code (ISO 3166-1 alpha-2)',
    required: false,
    example: 'US',
  },
  {
    field: 'passport_number',
    label: 'Passport Number',
    description: 'Passport or travel document number',
    required: false,
    example: 'AB1234567',
  },
];

export const TRIP_FIELD_METADATA: FieldMetadata[] = [
  {
    field: 'employee_email',
    label: 'Employee Email',
    description: 'Email of the employee taking this trip (used to link trip to employee)',
    required: true,
    example: 'john.smith@company.com',
  },
  {
    field: 'employee_name',
    label: 'Employee Name',
    description: 'Name of the employee taking this trip (optional, for reference)',
    required: false,
    example: 'John Smith',
  },
  {
    field: 'entry_date',
    label: 'Entry Date',
    description: 'Date entering the Schengen area',
    required: true,
    example: '2025-03-15',
  },
  {
    field: 'exit_date',
    label: 'Exit Date',
    description: 'Date leaving the Schengen area',
    required: true,
    example: '2025-03-22',
  },
  {
    field: 'country',
    label: 'Country',
    description: 'Destination country (Schengen member)',
    required: true,
    example: 'Germany',
  },
  {
    field: 'purpose',
    label: 'Purpose',
    description: 'Reason for travel (optional)',
    required: false,
    example: 'Client meeting',
  },
];

// Helper function to get field metadata by format
export function getFieldMetadata(format: ImportFormat): FieldMetadata[] {
  switch (format) {
    case 'employees':
      return EMPLOYEE_FIELD_METADATA;
    case 'trips':
    case 'gantt':
      return TRIP_FIELD_METADATA;
    default:
      return [];
  }
}

// Helper function to get required fields by format
export function getRequiredFields(format: ImportFormat): TargetField[] {
  switch (format) {
    case 'employees':
      return REQUIRED_EMPLOYEE_FIELDS;
    case 'trips':
    case 'gantt':
      return REQUIRED_TRIP_FIELDS;
    default:
      return [];
  }
}
