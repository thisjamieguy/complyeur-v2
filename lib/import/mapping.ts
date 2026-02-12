/**
 * Column Mapping Logic for ComplyEur Import
 *
 * Handles the initialization, detection, and application of column mappings.
 * Integrates with header-aliases.ts for auto-detection and supports
 * saved mappings from the database.
 *
 * Flow:
 * 1. Auto-detect mappings via header aliases
 * 2. Apply any saved company mappings for remaining columns
 * 3. If required fields are still unmapped, prompt user for manual mapping
 * 4. Apply final mappings to transform data
 */

import type {
  ImportFormat,
  ParsedRow,
  MappingState,
  ColumnMapping,
  MappingConfidence,
  TargetField,
  SavedColumnMapping,
} from '@/types/import';
import {
  getRequiredFields,
  REQUIRED_EMPLOYEE_FIELDS,
  REQUIRED_TRIP_FIELDS,
} from '@/types/import';
import { mapHeaders, type CanonicalField } from './header-aliases';
import { parseDate } from './date-parser';
import type { PreferredImportDateFormat } from './date-preferences';

// ============================================================
// HELPER: Extract Sample Values
// ============================================================

/**
 * Extracts the first N non-empty values from a column in the parsed data.
 * Used to show users what data a column contains for mapping decisions.
 */
export function getSampleValues(
  data: Record<string, unknown>[],
  columnName: string,
  limit: number = 5
): string[] {
  const samples: string[] = [];

  for (const row of data) {
    if (samples.length >= limit) break;

    const value = row[columnName];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      const strValue = String(value).trim();
      // Avoid duplicates in samples
      if (!samples.includes(strValue)) {
        samples.push(strValue);
      }
    }
  }

  return samples;
}

// ============================================================
// HELPER: Map canonical fields to target fields
// ============================================================

/**
 * Maps CanonicalField (from header-aliases) to TargetField (from types).
 * Some canonical fields map directly, others need translation based on format.
 *
 * @param canonical - The canonical field from header alias detection
 * @param format - The import format (affects email field mapping)
 */
function canonicalToTarget(canonical: CanonicalField, format: ImportFormat): TargetField | null {
  // For trips/gantt, 'email' canonical field should map to 'employee_email' target
  // For employees, 'email' maps to 'email'
  const emailTarget: TargetField = format === 'employees' ? 'email' : 'employee_email';

  const mapping: Record<CanonicalField, TargetField | null> = {
    first_name: 'first_name',
    last_name: 'last_name',
    employee_name: 'employee_name',
    email: emailTarget,
    entry_date: 'entry_date',
    exit_date: 'exit_date',
    country: 'country',
    nationality: 'nationality',
    passport_number: 'passport_number',
    passport_expiry: null, // Not a target field currently
    department: null, // Not a target field currently
    purpose: 'purpose',
    job_reference: null, // Not a target field currently
  };

  return mapping[canonical];
}

// ============================================================
// INITIALIZE MAPPING STATE
// ============================================================

/**
 * Creates the initial mapping state for a set of headers.
 *
 * Priority order:
 * 1. Exact match via header aliases (confidence: 'auto')
 * 2. Match from saved company mapping (confidence: 'saved')
 * 3. No match (confidence: 'unmapped')
 *
 * @param headers - Column headers from the uploaded file
 * @param format - Import format (employees, trips, gantt)
 * @param sessionId - Import session ID
 * @param savedMappings - Optional saved mappings from database
 * @param rawData - Raw parsed data for sample value extraction
 * @returns MappingState with all columns mapped or unmapped
 */
export function initializeMappingState(
  headers: string[],
  format: ImportFormat,
  sessionId: string,
  savedMappings: SavedColumnMapping[] = [],
  rawData: Record<string, unknown>[] = []
): MappingState {
  const requiredFields = getRequiredFields(format);

  // Step 1: Try auto-detection via header aliases
  const aliasResult = mapHeaders(headers, requiredFields as CanonicalField[]);

  // Track which target fields have been mapped
  const mappedTargets = new Set<TargetField>();

  // Build initial mappings
  const mappings: ColumnMapping[] = headers.map((header, index) => {
    const canonical = aliasResult.mappings.get(index);
    const sampleValues = getSampleValues(rawData, header);

    if (canonical) {
      const targetField = canonicalToTarget(canonical, format);
      if (targetField && !mappedTargets.has(targetField)) {
        mappedTargets.add(targetField);
        return {
          sourceColumn: header,
          targetField,
          confidence: 'auto' as MappingConfidence,
          sampleValues,
        };
      }
    }

    // Not auto-detected, start as unmapped
    return {
      sourceColumn: header,
      targetField: null,
      confidence: 'unmapped' as MappingConfidence,
      sampleValues,
    };
  });

  // Step 2: Try saved mappings for unmapped columns
  // Find the most recently used saved mapping for this format
  const relevantSavedMappings = savedMappings
    .filter((m) => m.format === format)
    .sort((a, b) => {
      // Sort by last_used_at descending, then times_used descending
      if (a.last_used_at && b.last_used_at) {
        return new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime();
      }
      if (a.last_used_at) return -1;
      if (b.last_used_at) return 1;
      return b.times_used - a.times_used;
    });

  for (const savedMapping of relevantSavedMappings) {
    for (const mapping of mappings) {
      if (mapping.confidence === 'unmapped') {
        const savedTarget = savedMapping.mappings[mapping.sourceColumn] as TargetField | undefined;
        if (savedTarget && !mappedTargets.has(savedTarget)) {
          mapping.targetField = savedTarget;
          mapping.confidence = 'saved';
          mappedTargets.add(savedTarget);
        }
      }
    }
  }

  // Calculate completeness
  const unmappedRequired = requiredFields.filter(
    (field) => !mappedTargets.has(field as TargetField)
  );

  return {
    sessionId,
    format,
    sourceColumns: headers,
    mappings,
    isComplete: unmappedRequired.length === 0,
    unmappedRequired: unmappedRequired as string[],
  };
}

// ============================================================
// CHECK IF MANUAL MAPPING IS NEEDED
// ============================================================

/**
 * Determines if manual mapping UI should be shown.
 *
 * Returns false if all required fields are mapped with 'auto' or 'saved' confidence.
 * Returns true if any required field is 'unmapped'.
 *
 * @param state - Current mapping state
 * @returns true if user must manually map columns
 */
export function needsManualMapping(state: MappingState): boolean {
  return !state.isComplete;
}

// ============================================================
// VALIDATE MAPPING STATE
// ============================================================

/**
 * Validates the current mapping state.
 *
 * Checks:
 * 1. All required fields are mapped
 * 2. No duplicate target field mappings
 *
 * @param state - Current mapping state
 * @returns Validation result with errors if any
 */
export function validateMappingState(state: MappingState): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const requiredFields = getRequiredFields(state.format);
  const mappedTargets = new Map<TargetField, string>();

  // Check for mapped targets
  for (const mapping of state.mappings) {
    if (mapping.targetField) {
      if (mappedTargets.has(mapping.targetField)) {
        errors.push(
          `Duplicate mapping: "${mapping.sourceColumn}" and "${mappedTargets.get(
            mapping.targetField
          )}" both map to "${mapping.targetField}"`
        );
      } else {
        mappedTargets.set(mapping.targetField, mapping.sourceColumn);
      }
    }
  }

  // Check required fields
  for (const required of requiredFields) {
    if (!mappedTargets.has(required as TargetField)) {
      errors.push(`Required field not mapped: ${required}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================
// UPDATE MAPPING
// ============================================================

/**
 * Updates a single column's mapping in the state.
 *
 * @param state - Current mapping state
 * @param sourceColumn - Column name to update
 * @param targetField - New target field (null to skip/unmap)
 * @returns Updated mapping state
 */
export function updateMapping(
  state: MappingState,
  sourceColumn: string,
  targetField: TargetField | null
): MappingState {
  const newMappings = state.mappings.map((m) => {
    if (m.sourceColumn === sourceColumn) {
      return {
        ...m,
        targetField,
        confidence: (targetField ? 'manual' : 'skipped') as MappingConfidence,
      };
    }
    return m;
  });

  // Recalculate completeness
  const requiredFields = getRequiredFields(state.format);
  const mappedTargets = new Set(
    newMappings.filter((m) => m.targetField).map((m) => m.targetField as TargetField)
  );
  const unmappedRequired = requiredFields.filter((f) => !mappedTargets.has(f as TargetField));

  return {
    ...state,
    mappings: newMappings,
    isComplete: unmappedRequired.length === 0,
    unmappedRequired: unmappedRequired as string[],
  };
}

// ============================================================
// APPLY MAPPINGS TO DATA
// ============================================================

/**
 * Transforms raw parsed data using the finalized column mappings.
 *
 * Takes raw rows with original column names and returns rows with
 * target field names as keys.
 *
 * @param rawData - Raw parsed data with original column names
 * @param mappings - Finalized column mappings
 * @returns Transformed data with target field names
 */
export function applyMappings(
  rawData: Record<string, unknown>[],
  mappings: ColumnMapping[],
  options: { preferredDateFormat?: PreferredImportDateFormat } = {}
): ParsedRow[] {
  const preferredDateFormat = options.preferredDateFormat ?? 'DD/MM';

  // Create lookup: sourceColumn → targetField
  const mappingLookup = new Map<string, TargetField>();
  for (const mapping of mappings) {
    if (mapping.targetField) {
      mappingLookup.set(mapping.sourceColumn, mapping.targetField);
    }
  }

  return rawData.map((row, index) => {
    const transformed: Record<string, unknown> = {
      row_number: index + 1,
    };

    for (const [sourceColumn, value] of Object.entries(row)) {
      const targetField = mappingLookup.get(sourceColumn);
      if (targetField) {
        if (targetField === 'entry_date' || targetField === 'exit_date') {
          const rawDateValue = value === null || value === undefined ? '' : String(value).trim();
          if (!rawDateValue) {
            transformed[targetField] = '';
          } else {
            const parsed = parseDate(rawDateValue, { preferredFormat: preferredDateFormat });
            transformed[targetField] = parsed.date ?? rawDateValue;
          }
        } else {
          transformed[targetField] = value;
        }
      }
    }

    // Cast through unknown to ParsedRow
    // This is safe because we're constructing the object with the required fields
    return transformed as unknown as ParsedRow;
  });
}

// ============================================================
// CONVERT MAPPINGS FOR STORAGE
// ============================================================

/**
 * Converts MappingState mappings to storage format.
 *
 * The database stores mappings as { "source": "target" } object,
 * not as an array of ColumnMapping objects.
 *
 * @param mappings - Array of ColumnMapping objects
 * @returns Record suitable for database storage
 */
export function mappingsToStorageFormat(
  mappings: ColumnMapping[]
): Record<string, TargetField> {
  const result: Record<string, TargetField> = {};

  for (const mapping of mappings) {
    if (mapping.targetField && mapping.confidence !== 'skipped') {
      result[mapping.sourceColumn] = mapping.targetField;
    }
  }

  return result;
}

// ============================================================
// GET AVAILABLE TARGET FIELDS
// ============================================================

/**
 * Gets list of target fields available for mapping, excluding already-mapped ones.
 *
 * @param format - Import format
 * @param currentMappings - Current mapping state
 * @param excludeSourceColumn - Column to exclude from "already mapped" check
 * @returns Array of available target fields
 */
export function getAvailableTargetFields(
  format: ImportFormat,
  currentMappings: ColumnMapping[],
  excludeSourceColumn?: string
): TargetField[] {
  const allFields: TargetField[] =
    format === 'employees'
      ? ['name', 'first_name', 'last_name', 'email', 'nationality', 'passport_number']
      : ['employee_name', 'employee_email', 'entry_date', 'exit_date', 'country', 'purpose'];

  const usedFields = new Set<TargetField>();
  for (const mapping of currentMappings) {
    if (mapping.targetField && mapping.sourceColumn !== excludeSourceColumn) {
      usedFields.add(mapping.targetField);
    }
  }

  return allFields.filter((f) => !usedFields.has(f));
}

// ============================================================
// FIND BEST SAVED MAPPING
// ============================================================

/**
 * Finds the best matching saved mapping for the current file's columns.
 *
 * Scores mappings based on how many columns match, weighted by
 * usage count and recency.
 *
 * @param headers - Column headers from uploaded file
 * @param format - Import format
 * @param savedMappings - Available saved mappings
 * @returns Best matching saved mapping or null
 */
export function findBestSavedMapping(
  headers: string[],
  format: ImportFormat,
  savedMappings: SavedColumnMapping[]
): SavedColumnMapping | null {
  const relevantMappings = savedMappings.filter((m) => m.format === format);

  if (relevantMappings.length === 0) {
    return null;
  }

  const headerSet = new Set(headers);
  let bestMapping: SavedColumnMapping | null = null;
  let bestScore = 0;

  for (const mapping of relevantMappings) {
    const savedColumns = Object.keys(mapping.mappings);
    const matchCount = savedColumns.filter((col) => headerSet.has(col)).length;

    if (matchCount === 0) continue;

    // Score: match percentage + bonus for usage
    const matchPercentage = matchCount / savedColumns.length;
    const usageBonus = Math.min(mapping.times_used / 100, 0.1); // Max 10% bonus
    const score = matchPercentage + usageBonus;

    if (score > bestScore) {
      bestScore = score;
      bestMapping = mapping;
    }
  }

  return bestMapping;
}
