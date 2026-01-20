import { createClient } from '@/lib/supabase/server';
import {
  ImportFormat,
  ImportResult,
  ValidatedRow,
  ParsedRow,
  ParsedEmployeeRow,
  ParsedTripRow,
  ValidationError,
  isParsedEmployeeRow,
  isParsedTripRow,
  DuplicateOptions,
  DEFAULT_DUPLICATE_OPTIONS,
} from '@/types/import';
import { toCountryCode } from './country-codes';
import { requireCompanyAccess } from '@/lib/security/tenant-access'

// ============================================================
// INSERT VALID ROWS
// ============================================================

export async function insertValidRows(
  sessionId: string,
  format: ImportFormat,
  rows: ValidatedRow<ParsedRow>[],
  duplicateOptions: DuplicateOptions = DEFAULT_DUPLICATE_OPTIONS
): Promise<ImportResult> {
  const supabase = await createClient();

  // Get current user's company
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .single();

  if (profileError || !profile?.company_id) {
    return {
      success: false,
      employees_created: 0,
      employees_updated: 0,
      trips_created: 0,
      trips_skipped: 0,
      errors: [
        {
          row: 0,
          column: '',
          value: '',
          message: 'Failed to get user profile',
          severity: 'error',
        },
      ],
      warnings: [],
    };
  }

  const { data: session, error: sessionError } = await supabase
    .from('import_sessions')
    .select('company_id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session?.company_id) {
    return {
      success: false,
      employees_created: 0,
      employees_updated: 0,
      trips_created: 0,
      trips_skipped: 0,
      errors: [
        {
          row: 0,
          column: '',
          value: '',
          message: 'Import session not found',
          severity: 'error',
        },
      ],
      warnings: [],
    };
  }

  try {
    await requireCompanyAccess(supabase, session.company_id)
  } catch (error) {
    return {
      success: false,
      employees_created: 0,
      employees_updated: 0,
      trips_created: 0,
      trips_skipped: 0,
      errors: [
        {
          row: 0,
          column: '',
          value: '',
          message: 'Access denied for import session',
          severity: 'error',
        },
      ],
      warnings: [],
    };
  }

  const companyId = profile.company_id;

  if (format === 'employees') {
    return insertEmployees(supabase, companyId, rows, duplicateOptions);
  } else if (format === 'trips') {
    return insertTrips(supabase, companyId, rows, duplicateOptions);
  }

  return {
    success: false,
    employees_created: 0,
    employees_updated: 0,
    trips_created: 0,
    trips_skipped: 0,
    errors: [
      {
        row: 0,
        column: '',
        value: '',
        message: 'Unsupported import format',
        severity: 'error',
      },
    ],
    warnings: [],
  };
}

// ============================================================
// INSERT EMPLOYEES
// ============================================================

async function insertEmployees(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  rows: ValidatedRow<ParsedRow>[],
  duplicateOptions: DuplicateOptions
): Promise<ImportResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let employeesCreated = 0;
  let employeesUpdated = 0;

  // Get existing employees (include email for duplicate detection)
  const { data: existingEmployees } = await supabase
    .from('employees')
    .select('id, name, email')
    .eq('company_id', companyId);

  // Build email lookup map for duplicate detection
  const existingEmailMap = new Map(
    (existingEmployees ?? [])
      .filter((e) => e.email)
      .map((e) => [e.email!.toLowerCase().trim(), e])
  );

  // Filter valid rows
  const validRows = rows.filter((r) => r.is_valid);

  // Collect warnings from validation
  for (const row of rows) {
    warnings.push(...row.warnings);
  }

  // Prepare employees to insert and update
  const employeesToInsert: { name: string; email: string; company_id: string }[] = [];
  const employeesToUpdate: { id: string; name: string; rowNum: number }[] = [];

  for (const row of validRows) {
    if (!isParsedEmployeeRow(row.data)) continue;

    const employeeData = row.data as ParsedEmployeeRow;
    const fullName = `${employeeData.first_name.trim()} ${employeeData.last_name.trim()}`;
    const normalizedEmail = employeeData.email.toLowerCase().trim();

    // Check for duplicate by email
    const existingEmployee = existingEmailMap.get(normalizedEmail);

    if (existingEmployee) {
      if (duplicateOptions.employees === 'update') {
        // Queue for update
        employeesToUpdate.push({
          id: existingEmployee.id,
          name: fullName,
          rowNum: row.row_number,
        });
      } else {
        // Skip mode - add warning
        warnings.push({
          row: row.row_number,
          column: 'email',
          value: employeeData.email,
          message: `Employee with email "${employeeData.email}" already exists, skipped`,
          severity: 'warning',
        });
      }
      continue;
    }

    // New employee - queue for insert
    employeesToInsert.push({
      name: fullName,
      email: employeeData.email.trim(),
      company_id: companyId,
    });
  }

  // Batch insert new employees
  if (employeesToInsert.length > 0) {
    const { data: insertedEmployees, error: insertError } = await supabase
      .from('employees')
      .insert(employeesToInsert)
      .select();

    if (insertError) {
      console.error('Failed to insert employees:', insertError);
      errors.push({
        row: 0,
        column: '',
        value: '',
        message: `Database error: ${insertError.message}`,
        severity: 'error',
      });
    } else {
      employeesCreated = insertedEmployees?.length ?? 0;
    }
  }

  // Update existing employees
  for (const emp of employeesToUpdate) {
    const { error: updateError } = await supabase
      .from('employees')
      .update({ name: emp.name })
      .eq('id', emp.id);

    if (updateError) {
      console.error('Failed to update employee:', updateError);
      errors.push({
        row: emp.rowNum,
        column: '',
        value: '',
        message: `Failed to update employee: ${updateError.message}`,
        severity: 'error',
      });
    } else {
      employeesUpdated++;
    }
  }

  // Log the import to audit log
  await supabase.from('audit_log').insert({
    company_id: companyId,
    action: 'bulk_import_employees',
    entity_type: 'employee',
    details: {
      total_rows: rows.length,
      employees_created: employeesCreated,
      employees_updated: employeesUpdated,
      employees_skipped: Math.max(0, validRows.length - employeesCreated - employeesUpdated),
      error_count: errors.length,
      warning_count: warnings.length,
      duplicate_mode: duplicateOptions.employees,
    },
  });

  return {
    success: errors.length === 0,
    employees_created: employeesCreated,
    employees_updated: employeesUpdated,
    trips_created: 0,
    trips_skipped: 0,
    errors,
    warnings,
  };
}

// ============================================================
// INSERT TRIPS
// ============================================================

async function insertTrips(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  rows: ValidatedRow<ParsedRow>[],
  duplicateOptions: DuplicateOptions
): Promise<ImportResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let tripsCreated = 0;
  let tripsSkipped = 0;

  // Get all employees for this company to match by email
  const { data: employees } = await supabase
    .from('employees')
    .select('id, email')
    .eq('company_id', companyId);

  const employeeEmailMap = new Map(
    (employees ?? [])
      .filter((e) => e.email)
      .map((e) => [e.email!.toLowerCase().trim(), e.id])
  );

  // Get existing trips for duplicate detection
  const { data: existingTrips } = await supabase
    .from('trips')
    .select('id, employee_id, entry_date, exit_date')
    .eq('company_id', companyId);

  // Build a set of existing trip keys for fast lookup
  // Key format: "employeeId|entryDate|exitDate"
  const existingTripKeys = new Set(
    (existingTrips ?? []).map((t) => `${t.employee_id}|${t.entry_date}|${t.exit_date}`)
  );

  // Collect warnings from validation
  for (const row of rows) {
    warnings.push(...row.warnings);
  }

  // Filter valid rows
  const validRows = rows.filter((r) => r.is_valid);

  // Prepare trips to insert
  const tripsToInsert: {
    employee_id: string;
    company_id: string;
    country: string;
    entry_date: string;
    exit_date: string;
    purpose?: string;
  }[] = [];

  // Track trips we're adding to avoid duplicates within the same import
  const newTripKeys = new Set<string>();

  for (const row of validRows) {
    if (!isParsedTripRow(row.data)) continue;

    const tripData = row.data as ParsedTripRow;
    const normalizedEmail = tripData.employee_email.toLowerCase().trim();

    // Find matching employee by email
    const employeeId = employeeEmailMap.get(normalizedEmail);

    if (!employeeId) {
      errors.push({
        row: row.row_number,
        column: 'employee_email',
        value: tripData.employee_email,
        message: `No employee found with email "${tripData.employee_email}". Create the employee first or check the email address.`,
        severity: 'error',
      });
      tripsSkipped++;
      continue;
    }

    // Convert country name to 2-letter code (validation already confirmed it's valid)
    const countryCode = toCountryCode(tripData.country) ?? tripData.country.trim().toUpperCase();

    // Check for duplicate trip (same employee + same dates)
    const tripKey = `${employeeId}|${tripData.entry_date}|${tripData.exit_date}`;

    if (existingTripKeys.has(tripKey) || newTripKeys.has(tripKey)) {
      warnings.push({
        row: row.row_number,
        column: 'entry_date',
        value: `${tripData.entry_date} - ${tripData.exit_date}`,
        message: `Trip already exists for this employee with the same dates (${tripData.entry_date} to ${tripData.exit_date}), skipped`,
        severity: 'warning',
      });
      tripsSkipped++;
      continue;
    }

    // Mark this trip as being added
    newTripKeys.add(tripKey);

    tripsToInsert.push({
      employee_id: employeeId,
      company_id: companyId,
      country: countryCode,
      entry_date: tripData.entry_date,
      exit_date: tripData.exit_date,
      purpose: tripData.purpose?.trim(),
    });
  }

  // Batch insert trips
  if (tripsToInsert.length > 0) {
    const { data: insertedTrips, error: insertError } = await supabase
      .from('trips')
      .insert(tripsToInsert)
      .select();

    if (insertError) {
      console.error('Failed to insert trips:', insertError);
      errors.push({
        row: 0,
        column: '',
        value: '',
        message: `Database error: ${insertError.message}`,
        severity: 'error',
      });
    } else {
      tripsCreated = insertedTrips?.length ?? 0;
    }
  }

  // Log the import to audit log
  await supabase.from('audit_log').insert({
    company_id: companyId,
    action: 'bulk_import_trips',
    entity_type: 'trip',
    details: {
      total_rows: rows.length,
      trips_created: tripsCreated,
      trips_skipped: tripsSkipped + (rows.length - validRows.length),
      error_count: errors.length,
      warning_count: warnings.length,
    },
  });

  return {
    success: errors.filter((e) => e.severity === 'error').length === 0,
    employees_created: 0,
    employees_updated: 0,
    trips_created: tripsCreated,
    trips_skipped: tripsSkipped,
    errors,
    warnings,
  };
}
