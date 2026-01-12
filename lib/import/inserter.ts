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
} from '@/types/import';

// ============================================================
// INSERT VALID ROWS
// ============================================================

export async function insertValidRows(
  sessionId: string,
  format: ImportFormat,
  rows: ValidatedRow<ParsedRow>[]
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

  const companyId = profile.company_id;

  if (format === 'employees') {
    return insertEmployees(supabase, companyId, rows);
  } else if (format === 'trips') {
    return insertTrips(supabase, companyId, rows);
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
  rows: ValidatedRow<ParsedRow>[]
): Promise<ImportResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let employeesCreated = 0;
  let employeesUpdated = 0;

  // Get existing employees
  const { data: existingEmployees } = await supabase
    .from('employees')
    .select('id, name')
    .eq('company_id', companyId);

  const existingNameMap = new Map(
    (existingEmployees ?? []).map((e) => [e.name.toLowerCase().trim(), e.id])
  );

  // Filter valid rows
  const validRows = rows.filter((r) => r.is_valid);

  // Collect warnings from validation
  for (const row of rows) {
    warnings.push(...row.warnings);
  }

  // Prepare employees to insert
  const employeesToInsert: { name: string; company_id: string }[] = [];

  for (const row of validRows) {
    if (!isParsedEmployeeRow(row.data)) continue;

    const employeeData = row.data as ParsedEmployeeRow;
    const normalizedName = employeeData.name.toLowerCase().trim();

    // Skip if employee already exists
    if (existingNameMap.has(normalizedName)) {
      warnings.push({
        row: row.row_number,
        column: 'name',
        value: employeeData.name,
        message: 'Employee already exists, skipped',
        severity: 'warning',
      });
      continue;
    }

    employeesToInsert.push({
      name: employeeData.name.trim(),
      company_id: companyId,
    });
  }

  // Batch insert employees
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

  // Log the import to audit log
  await supabase.from('audit_log').insert({
    company_id: companyId,
    action: 'bulk_import_employees',
    entity_type: 'employee',
    details: {
      total_rows: rows.length,
      employees_created: employeesCreated,
      employees_skipped: rows.length - employeesCreated,
      error_count: errors.length,
      warning_count: warnings.length,
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
  rows: ValidatedRow<ParsedRow>[]
): Promise<ImportResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let tripsCreated = 0;
  let tripsSkipped = 0;

  // Get all employees for this company to match by name
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name')
    .eq('company_id', companyId);

  const employeeNameMap = new Map(
    (employees ?? []).map((e) => [e.name.toLowerCase().trim(), e.id])
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

  for (const row of validRows) {
    if (!isParsedTripRow(row.data)) continue;

    const tripData = row.data as ParsedTripRow;
    const normalizedName = tripData.employee_name.toLowerCase().trim();

    // Find matching employee
    const employeeId = employeeNameMap.get(normalizedName);

    if (!employeeId) {
      errors.push({
        row: row.row_number,
        column: 'employee_name',
        value: tripData.employee_name,
        message: `Employee "${tripData.employee_name}" not found. Create the employee first or check the spelling.`,
        severity: 'error',
      });
      tripsSkipped++;
      continue;
    }

    tripsToInsert.push({
      employee_id: employeeId,
      company_id: companyId,
      country: tripData.country.trim(),
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
