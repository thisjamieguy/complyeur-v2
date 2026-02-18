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
  } else if (format === 'trips' || format === 'gantt') {
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
  const employeeNameConflictMode = duplicateOptions.employee_name_conflicts ?? 'new_employee';

  // Get existing employees (include email for duplicate detection)
  // Filter out soft-deleted employees so re-imports work after deletion
  const { data: existingEmployees } = await supabase
    .from('employees')
    .select('id, name, email')
    .eq('company_id', companyId)
    .is('deleted_at', null);

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
  const seenNameCounts = new Map<string, number>();

  for (const row of validRows) {
    if (!isParsedEmployeeRow(row.data)) continue;

    const employeeData = row.data as ParsedEmployeeRow;
    const baseFullName = `${employeeData.first_name.trim()} ${employeeData.last_name.trim()}`;
    const normalizedName = baseFullName.toLowerCase().replace(/\s+/g, ' ').trim();
    const seenCount = seenNameCounts.get(normalizedName) ?? 0;
    let fullName = baseFullName;

    if (seenCount > 0) {
      if (employeeNameConflictMode === 'same_employee') {
        warnings.push({
          row: row.row_number,
          column: 'first_name',
          value: baseFullName,
          message: `Duplicate name "${baseFullName}" resolved as same employee. This row was skipped.`,
          severity: 'warning',
        });
        continue;
      }

      if (employeeNameConflictMode === 'rename') {
        fullName = `${baseFullName} (${seenCount + 1})`;
        warnings.push({
          row: row.row_number,
          column: 'first_name',
          value: baseFullName,
          message: `Duplicate name "${baseFullName}" was auto-renamed to "${fullName}" for import.`,
          severity: 'warning',
        });
      }
    }

    seenNameCounts.set(normalizedName, seenCount + 1);
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

  // Batch update existing employees
  if (employeesToUpdate.length > 0) {
    const updateResults = await Promise.all(
      employeesToUpdate.map(emp =>
        supabase
          .from('employees')
          .update({ name: emp.name })
          .eq('id', emp.id)
      )
    )

    for (let i = 0; i < updateResults.length; i++) {
      if (updateResults[i].error) {
        console.error('Failed to update employee:', updateResults[i].error)
        errors.push({
          row: employeesToUpdate[i].rowNum,
          column: '',
          value: '',
          message: `Failed to update employee: ${updateResults[i].error!.message}`,
          severity: 'error',
        })
      } else {
        employeesUpdated++
      }
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
      employee_name_conflict_mode: employeeNameConflictMode,
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
  let employeesCreated = 0;

  // Get all active employees for this company to match by email
  const { data: employees } = await supabase
    .from('employees')
    .select('id, email, name')
    .eq('company_id', companyId)
    .is('deleted_at', null);

  // Also get soft-deleted employees to restore them if needed during import
  const { data: deletedEmployees } = await supabase
    .from('employees')
    .select('id, email, name')
    .eq('company_id', companyId)
    .not('deleted_at', 'is', null);

  // Build a map of soft-deleted employees by email for restoration
  const deletedEmployeesByEmail = new Map(
    (deletedEmployees ?? [])
      .filter((e) => e.email)
      .map((e) => [e.email!.toLowerCase().trim(), e])
  );

  const normalizeName = (name: string): string =>
    name.trim().replace(/\s+/g, ' ').toLowerCase();

  const deriveNameFromEmail = (email: string): string => {
    const localPart = email.split('@')[0]?.trim();
    if (!localPart) return 'Unknown';
    const cleaned = localPart.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned) return 'Unknown';
    return cleaned
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const employeeEmailMap = new Map(
    (employees ?? [])
      .filter((e) => e.email)
      .map((e) => [e.email!.toLowerCase().trim(), e.id])
  );

  const employeeNameMap = new Map<string, string>();
  const duplicateNameKeys = new Set<string>();

  for (const employee of employees ?? []) {
    if (!employee.name) continue;
    const key = normalizeName(employee.name);
    if (!key) continue;

    if (employeeNameMap.has(key)) {
      duplicateNameKeys.add(key);
    } else {
      employeeNameMap.set(key, employee.id);
    }
  }

  for (const key of duplicateNameKeys) {
    employeeNameMap.delete(key);
  }

  const validRows = rows.filter((r) => r.is_valid);
  const warnedDuplicateNames = new Set<string>();

  const missingEmailEmployees = new Map<string, { email: string; name: string }>();
  const missingNameEmployees = new Map<string, { name: string }>();

  for (const row of validRows) {
    if (!isParsedTripRow(row.data)) continue;

    const tripData = row.data as ParsedTripRow;
    const normalizedEmail = (tripData.employee_email ?? '').toLowerCase().trim();
    const hasEmail = normalizedEmail.length > 0;
    const hasName = !!tripData.employee_name?.trim();

    if (hasEmail) {
      if (!employeeEmailMap.has(normalizedEmail) && !missingEmailEmployees.has(normalizedEmail)) {
        const name =
          tripData.employee_name?.trim() || deriveNameFromEmail(normalizedEmail) || 'Unknown';
        missingEmailEmployees.set(normalizedEmail, { email: normalizedEmail, name });
      }
      continue;
    }

    if (hasName) {
      const nameKey = normalizeName(tripData.employee_name!.trim());
      const hasExisting = employeeNameMap.has(nameKey);
      const isDuplicate = duplicateNameKeys.has(nameKey);
      if ((!hasExisting || isDuplicate) && !missingNameEmployees.has(nameKey)) {
        missingNameEmployees.set(nameKey, { name: tripData.employee_name!.trim() });
      }
    }
  }

  const employeesToInsert: { name: string; email?: string | null; company_id: string }[] = [];
  const employeesToRestore: { id: string; email: string; name: string }[] = [];

  for (const entry of missingEmailEmployees.values()) {
    // Check if this employee was soft-deleted - if so, restore instead of creating new
    const deletedEmployee = deletedEmployeesByEmail.get(entry.email);
    if (deletedEmployee) {
      employeesToRestore.push({
        id: deletedEmployee.id,
        email: entry.email,
        name: entry.name,
      });
    } else {
      employeesToInsert.push({
        name: entry.name,
        email: entry.email,
        company_id: companyId,
      });
    }
  }

  for (const entry of missingNameEmployees.values()) {
    employeesToInsert.push({
      name: entry.name,
      email: null,
      company_id: companyId,
    });
  }

  // Restore soft-deleted employees
  if (employeesToRestore.length > 0) {
    console.log('[TripImport] Restoring soft-deleted employees:', employeesToRestore.length)
    const restoreResults = await Promise.all(
      employeesToRestore.map(emp =>
        supabase
          .from('employees')
          .update({ deleted_at: null, name: emp.name })
          .eq('id', emp.id)
      )
    )

    for (let i = 0; i < restoreResults.length; i++) {
      const emp = employeesToRestore[i]
      if (restoreResults[i].error) {
        console.error('[TripImport] Failed to restore employee:', restoreResults[i].error)
        errors.push({
          row: 0,
          column: '',
          value: emp.email,
          message: `Failed to restore employee ${emp.email}: ${restoreResults[i].error!.message}`,
          severity: 'error',
        })
      } else {
        employeesCreated++
        employeeEmailMap.set(emp.email.toLowerCase().trim(), emp.id)
        if (emp.name) {
          employeeNameMap.set(normalizeName(emp.name), emp.id)
        }
        warnings.push({
          row: 0,
          column: 'employee_email',
          value: emp.email,
          message: `Restored previously deleted employee: ${emp.email}`,
          severity: 'warning',
        })
      }
    }
  }

  // Insert new employees
  if (employeesToInsert.length > 0) {
    console.log('[TripImport] Creating new employees:', employeesToInsert.length);
    const { data: insertedEmployees, error: insertEmployeesError } = await supabase
      .from('employees')
      .insert(employeesToInsert)
      .select('id, email, name');

    if (insertEmployeesError) {
      console.error('[TripImport] Failed to create employees:', insertEmployeesError);
      errors.push({
        row: 0,
        column: '',
        value: '',
        message: `Failed to create missing employees: ${insertEmployeesError.message}`,
        severity: 'error',
      });
    } else {
      employeesCreated += insertedEmployees?.length ?? 0;
      for (const employee of insertedEmployees ?? []) {
        if (employee.email) {
          employeeEmailMap.set(employee.email.toLowerCase().trim(), employee.id);
        }
        if (employee.name) {
          employeeNameMap.set(normalizeName(employee.name), employee.id);
        }
      }
    }
  }

  // Collect warnings from validation
  for (const row of rows) {
    warnings.push(...row.warnings);
  }

  // Prepare trips to insert
  const tripsToInsert: {
    employee_id: string;
    company_id: string;
    country: string;
    entry_date: string;
    exit_date: string;
    purpose?: string;
  }[] = [];

  // Pre-collect all unique employee IDs that will be referenced by trip rows
  // so we can batch-fetch their existing trips in one query (eliminates N+1)
  const uniqueEmployeeIds = new Set<string>();
  for (const row of validRows) {
    if (!isParsedTripRow(row.data)) continue;
    const tripData = row.data as ParsedTripRow;
    const normalizedEmail = (tripData.employee_email ?? '').toLowerCase().trim();
    const hasEmail = normalizedEmail.length > 0;
    const hasName = !!tripData.employee_name?.trim();

    let empId = hasEmail ? employeeEmailMap.get(normalizedEmail) : undefined;
    if (!empId && !hasEmail && hasName) {
      empId = employeeNameMap.get(normalizeName(tripData.employee_name!.trim()));
    }
    if (empId) uniqueEmployeeIds.add(empId);
  }

  // Batch fetch all existing trips for these employees in one query
  const existingTripsByEmployee = new Map<string, Array<{ company_id: string; entry_date: string; exit_date: string }>>();
  if (uniqueEmployeeIds.size > 0) {
    const { data: allExistingTrips, error: batchTripError } = await supabase
      .from('trips')
      .select('employee_id, company_id, entry_date, exit_date')
      .in('employee_id', Array.from(uniqueEmployeeIds));

    if (batchTripError) {
      errors.push({
        row: 0,
        column: '',
        value: '',
        message: `Failed to fetch existing trips for duplicate check: ${batchTripError.message}`,
        severity: 'error',
      });
    } else {
      // Group trips by employee_id, filtered to current company
      for (const trip of allExistingTrips ?? []) {
        if (trip.company_id && trip.company_id !== companyId) continue;
        const list = existingTripsByEmployee.get(trip.employee_id) ?? [];
        list.push({ company_id: trip.company_id, entry_date: trip.entry_date, exit_date: trip.exit_date });
        existingTripsByEmployee.set(trip.employee_id, list);
      }
    }
  }

  // Track trips we're adding to avoid duplicates within the same import
  const newTripKeys = new Set<string>();

  for (const row of validRows) {
    if (!isParsedTripRow(row.data)) continue;

    const tripData = row.data as ParsedTripRow;
    const normalizedEmail = (tripData.employee_email ?? '').toLowerCase().trim();
    const hasEmail = normalizedEmail.length > 0;
    const hasName = !!tripData.employee_name?.trim();

    // Find matching employee by email (preferred)
    let employeeId = hasEmail ? employeeEmailMap.get(normalizedEmail) : undefined;

    // Fallback: match by exact employee name when no email provided
    if (!employeeId && !hasEmail && hasName) {
      const nameKey = normalizeName(tripData.employee_name!.trim());
      if (duplicateNameKeys.has(nameKey) && !warnedDuplicateNames.has(nameKey)) {
        warnings.push({
          row: row.row_number,
          column: 'employee_name',
          value: tripData.employee_name ?? '',
          message: `Multiple employees found with name "${tripData.employee_name}". A new employee was created for this import.`,
          severity: 'warning',
        });
        warnedDuplicateNames.add(nameKey);
      }
      employeeId = employeeNameMap.get(nameKey);
      if (!employeeId) {
        warnings.push({
          row: row.row_number,
          column: 'employee_name',
          value: tripData.employee_name ?? '',
          message: `No employee found with name "${tripData.employee_name}", skipped`,
          severity: 'warning',
        });
        tripsSkipped++;
        continue;
      }
    }

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

    const isDuplicateInImport = newTripKeys.has(tripKey);
    const isDuplicateInDatabase = !isDuplicateInImport &&
      (existingTripsByEmployee.get(employeeId) ?? []).some((existingTrip) =>
        existingTrip.entry_date === tripData.entry_date && existingTrip.exit_date === tripData.exit_date
      );

    if (isDuplicateInImport || isDuplicateInDatabase) {
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
    console.log('[TripImport] Inserting trips:', {
      count: tripsToInsert.length,
      companyId,
      firstTrip: tripsToInsert[0],
    });

    const { data: insertedTrips, error: insertError } = await supabase
      .from('trips')
      .insert(tripsToInsert)
      .select();

    if (insertError) {
      console.error('[TripImport] Failed to insert trips:', insertError);
      errors.push({
        row: 0,
        column: '',
        value: '',
        message: `Database error: ${insertError.message}`,
        severity: 'error',
      });
    } else {
      tripsCreated = insertedTrips?.length ?? 0;
      console.log('[TripImport] Successfully inserted trips:', {
        count: tripsCreated,
        tripIds: insertedTrips?.map((t) => t.id),
      });
    }
  } else {
    console.log('[TripImport] No trips to insert - all skipped or no valid rows');
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
    employees_created: employeesCreated,
    employees_updated: 0,
    trips_created: tripsCreated,
    trips_skipped: tripsSkipped,
    errors,
    warnings,
  };
}
