/**
 * Header Alias System for ComplyEUR Import
 * Maps common column header variations to canonical field names.
 *
 * What it does:
 * - Normalizes messy/variant column headers (e.g., "Worker Name" → "employee_name")
 * - Supports flexible header matching for real-world spreadsheets
 * - Enables smart parsing without strict template requirements
 *
 * Why it matters:
 * - Users don't follow template formats exactly
 * - Reduces import failures from simple naming differences
 * - Improves user experience with "just works" imports
 */

export type CanonicalField =
  | 'first_name'
  | 'last_name'
  | 'employee_name'
  | 'email'
  | 'entry_date'
  | 'exit_date'
  | 'country'
  | 'nationality'
  | 'passport_number'
  | 'passport_expiry'
  | 'department'
  | 'purpose'
  | 'job_reference';

/**
 * Maps canonical field names to their common aliases.
 * Order matters: first match wins when multiple aliases could apply.
 */
const HEADER_ALIASES: Record<CanonicalField, readonly string[]> = {
  first_name: [
    'first_name',
    'first name',
    'firstname',
    'given name',
    'forename',
    'first',
  ],
  last_name: [
    'last_name',
    'last name',
    'lastname',
    'surname',
    'family name',
    'last',
  ],
  employee_name: [
    'employee_name',
    'employee name',
    'full name',
    'name',
    'worker',
    'worker name',
    'staff',
    'staff name',
    'person',
    'traveler',
    'traveller',
    'employee',
  ],
  email: [
    'email',
    'e-mail',
    'email address',
    'mail',
    'employee_email',
    'employee email',
    'work email',
    'email_address',
  ],
  entry_date: [
    'entry_date',
    'entry date',
    'start_date',
    'start date',
    'start',
    'from',
    'departure',
    'departure date',
    'begin',
    'begin date',
    'travel start',
    'trip start',
    'date from',
    'from date',
  ],
  exit_date: [
    'exit_date',
    'exit date',
    'end_date',
    'end date',
    'end',
    'to',
    'return',
    'return date',
    'finish',
    'finish date',
    'travel end',
    'trip end',
    'date to',
    'to date',
  ],
  country: [
    'country',
    'destination',
    'location',
    'where',
    'place',
    'dest',
    'country code',
    'schengen country',
    'destination country',
  ],
  nationality: [
    'nationality',
    'citizenship',
    'citizen',
    'national',
    'passport country',
    'citizen of',
  ],
  passport_number: [
    'passport_number',
    'passport number',
    'passport',
    'passport no',
    'passport no.',
    'document number',
    'document no',
    'passport#',
  ],
  passport_expiry: [
    'passport_expiry',
    'passport expiry',
    'expiry',
    'expiry date',
    'expires',
    'passport expires',
    'passport exp',
    'exp date',
  ],
  department: [
    'department',
    'dept',
    'dept.',
    'team',
    'division',
    'business unit',
    'bu',
    'cost center',
    'cost centre',
  ],
  purpose: [
    'purpose',
    'trip purpose',
    'reason',
    'travel reason',
    'notes',
    'description',
    'trip notes',
    'travel purpose',
  ],
  job_reference: [
    'job_reference',
    'job reference',
    'job_ref',
    'job ref',
    'project',
    'project code',
    'reference',
    'ref',
    'job number',
    'job no',
    'project number',
  ],
} as const;

// Build reverse lookup map for O(1) lookups
const ALIAS_TO_CANONICAL = new Map<string, CanonicalField>();
for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
  for (const alias of aliases) {
    // Only set if not already mapped (first canonical field wins for duplicate aliases)
    if (!ALIAS_TO_CANONICAL.has(alias.toLowerCase())) {
      ALIAS_TO_CANONICAL.set(alias.toLowerCase(), canonical as CanonicalField);
    }
  }
}

/**
 * Normalizes a header string to its canonical field name.
 *
 * @param header - The raw header string from the spreadsheet
 * @returns The canonical field name, or null if no match found
 *
 * @example
 * normalizeHeader("Worker Name") // → "employee_name"
 * normalizeHeader("START DATE")  // → "entry_date"
 * normalizeHeader("E-mail")      // → "email"
 * normalizeHeader("foo bar")     // → null
 */
export function normalizeHeader(header: string): CanonicalField | null {
  if (!header || typeof header !== 'string') {
    return null;
  }

  // Clean the header: lowercase, trim, normalize whitespace, replace separators
  const cleaned = header
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single
    .replace(/[_-]+/g, ' '); // Replace underscores/hyphens with spaces

  return ALIAS_TO_CANONICAL.get(cleaned) ?? null;
}

/**
 * Result of mapping headers to canonical fields.
 */
export interface HeaderMappingResult {
  /** Map of column index to canonical field name */
  mappings: Map<number, CanonicalField>;
  /** Columns that couldn't be mapped */
  unmapped: Array<{ index: number; header: string }>;
  /** Successfully mapped columns */
  mapped: Array<{ index: number; header: string; field: CanonicalField }>;
  /** Whether all required fields were found */
  hasRequiredFields: boolean;
  /** List of missing required fields */
  missingFields: CanonicalField[];
}

/**
 * Maps an array of headers to their canonical field names.
 *
 * @param headers - Array of raw header strings
 * @param requiredFields - Array of canonical fields that must be present
 * @returns Mapping result with found/missing fields
 *
 * @example
 * const result = mapHeaders(
 *   ["Worker Name", "Start Date", "End Date", "Country"],
 *   ["employee_name", "entry_date", "exit_date", "country"]
 * );
 * // result.hasRequiredFields === true
 */
export function mapHeaders(
  headers: string[],
  requiredFields: CanonicalField[]
): HeaderMappingResult {
  const mappings = new Map<number, CanonicalField>();
  const unmapped: Array<{ index: number; header: string }> = [];
  const mapped: Array<{ index: number; header: string; field: CanonicalField }> = [];
  const foundFields = new Set<CanonicalField>();

  headers.forEach((header, index) => {
    const canonical = normalizeHeader(header);

    if (canonical && !foundFields.has(canonical)) {
      // Only map the first occurrence of each canonical field
      mappings.set(index, canonical);
      mapped.push({ index, header, field: canonical });
      foundFields.add(canonical);
    } else {
      unmapped.push({ index, header });
    }
  });

  const missingFields = requiredFields.filter((f) => !foundFields.has(f));

  return {
    mappings,
    unmapped,
    mapped,
    hasRequiredFields: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Required fields by import format.
 * Each format can have multiple valid configurations (e.g., full name vs first/last name).
 */
export const REQUIRED_FIELDS_BY_FORMAT = {
  /** Employee import with first + last name */
  employees: ['first_name', 'last_name', 'email'] as CanonicalField[],
  /** Employee import with full name only */
  employees_alt: ['employee_name', 'email'] as CanonicalField[],
  /** Employee import (simplified - name only, matching existing schema) */
  employees_simple: ['employee_name'] as CanonicalField[],
  /** Trip import with email identifier */
  trips: ['email', 'entry_date', 'exit_date', 'country'] as CanonicalField[],
  /** Trip import with name identifier */
  trips_alt: ['employee_name', 'entry_date', 'exit_date', 'country'] as CanonicalField[],
  /** Gantt/schedule format - only needs employee identifier */
  gantt: ['employee_name'] as CanonicalField[],
} as const;

/**
 * Checks if headers satisfy any of the valid configurations for a format.
 *
 * @param headers - Array of raw header strings
 * @param format - The import format type
 * @returns Object with success status and matched configuration
 */
export function checkFormatRequirements(
  headers: string[],
  format: 'employees' | 'trips' | 'gantt'
): {
  isValid: boolean;
  matchedConfig: string | null;
  mapping: HeaderMappingResult | null;
  suggestions: string[];
} {
  // Determine which field configurations to try based on format
  let configsToTry: CanonicalField[][];

  switch (format) {
    case 'employees':
      configsToTry = [
        REQUIRED_FIELDS_BY_FORMAT.employees_simple,
        REQUIRED_FIELDS_BY_FORMAT.employees_alt,
      ];
      break;
    case 'trips':
      configsToTry = [
        REQUIRED_FIELDS_BY_FORMAT.trips_alt,
        REQUIRED_FIELDS_BY_FORMAT.trips,
      ];
      break;
    case 'gantt':
      configsToTry = [REQUIRED_FIELDS_BY_FORMAT.gantt];
      break;
  }

  for (const required of configsToTry) {
    const result = mapHeaders(headers, required);
    if (result.hasRequiredFields) {
      return {
        isValid: true,
        matchedConfig: required.join('+'),
        mapping: result,
        suggestions: [],
      };
    }
  }

  // No valid config found - provide suggestions
  const bestMapping = mapHeaders(headers, configsToTry[0]);
  const suggestions = bestMapping.missingFields.map(
    (field) => `Missing: ${field} (try: ${HEADER_ALIASES[field].slice(0, 3).join(', ')})`
  );

  return {
    isValid: false,
    matchedConfig: null,
    mapping: bestMapping,
    suggestions,
  };
}

/**
 * Gets all known aliases for a canonical field (useful for error messages).
 */
export function getFieldAliases(field: CanonicalField): readonly string[] {
  return HEADER_ALIASES[field] ?? [];
}

/**
 * Checks if a string could be a date-like header (for Gantt detection).
 */
export function isDateLikeHeader(header: string): boolean {
  if (!header || typeof header !== 'string') return false;

  const cleaned = header.trim();

  // Check for common date patterns
  const datePatterns = [
    /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/, // 01/02/2025, 1-2-25
    /^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/, // 2025-01-02
    /^[A-Za-z]{3}\s+\d{1,2}$/, // Mon 06
    /^[A-Za-z]{3}\s+\d{1,2}\s+[A-Za-z]{3}$/, // Mon 06 Jan
    /^\d{1,2}[\/\-][A-Za-z]{3}$/, // 06-Jan, 06/Jan
    /^[A-Za-z]{3,9}\s+\d{1,2}$/, // January 6
    /^\d{1,2}\s+[A-Za-z]{3,9}$/, // 6 January
  ];

  return datePatterns.some((pattern) => pattern.test(cleaned));
}
