'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { Json } from '@/types/database';
import { checkServerActionRateLimit } from '@/lib/rate-limit'
import { enforceMfaForPrivilegedUser } from '@/lib/security/mfa'
import { requireCompanyAccess, requireCompanyAccessCached } from '@/lib/security/tenant-access'
import { validateRows } from '@/lib/import/validator'
import {
  ImportFormat,
  ImportSession,
  ImportResult,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  ParsedRow,
  UploadResult,
  ImportStatus,
  ValidationError,
  SavedColumnMapping,
  TargetField,
  SaveMappingInputSchema,
  DuplicateOptions,
  DEFAULT_DUPLICATE_OPTIONS,
} from '@/types/import';

// ============================================================
// TYPE HELPERS
// ============================================================

// Helper to convert database row to ImportSession type
function dbRowToImportSession(row: {
  id: string;
  company_id: string;
  user_id: string;
  format: string;
  status: string;
  file_name: string;
  file_size: number;
  total_rows: number | null;
  valid_rows: number | null;
  error_rows: number | null;
  parsed_data: Json | null;
  validation_errors: Json;
  result: Json | null;
  created_at: string | null;
  completed_at: string | null;
}): ImportSession {
  return {
    id: row.id,
    company_id: row.company_id,
    user_id: row.user_id,
    format: row.format as ImportFormat,
    status: row.status as ImportStatus,
    file_name: row.file_name,
    file_size: row.file_size,
    total_rows: row.total_rows ?? 0,
    valid_rows: row.valid_rows ?? 0,
    error_rows: row.error_rows ?? 0,
    parsed_data: row.parsed_data as unknown as ParsedRow[] | null,
    validation_errors: (row.validation_errors as unknown as ValidationError[]) ?? [],
    result: row.result as ImportResult | null,
    created_at: row.created_at ?? new Date().toISOString(),
    completed_at: row.completed_at,
  };
}

// ============================================================
// SECURITY: File Validation
// ============================================================

function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
    };
  }

  // Check file size minimum
  if (file.size === 0) {
    return { valid: false, error: 'File is empty.' };
  }

  // Check MIME type
  const mimeType = file.type;
  if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    // Also check extension as fallback (some browsers don't set MIME correctly)
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])) {
      return {
        valid: false,
        error: 'Invalid file type. Only .xlsx, .xls, and .csv files are accepted.',
      };
    }
  }

  // Check for dangerous extensions (macro-enabled files)
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.xlsm') || fileName.endsWith('.xlsb')) {
    return {
      valid: false,
      error: 'Macro-enabled files (.xlsm, .xlsb) are not allowed for security reasons.',
    };
  }

  return { valid: true };
}

// ============================================================
// CHECK ENTITLEMENTS
// ============================================================

async function checkBulkImportEntitlement(
  companyId: string,
  useAdminClient: boolean
): Promise<boolean> {
  const supabase = useAdminClient ? createAdminClient() : await createClient();

  const { data: entitlements } = await supabase
    .from('company_entitlements')
    .select('can_bulk_import')
    .eq('company_id', companyId)
    .single();

  return entitlements?.can_bulk_import ?? false;
}

// ============================================================
// CREATE IMPORT SESSION
// ============================================================

export async function createImportSession(formData: FormData): Promise<UploadResult> {
  try {
    const isDev = process.env.NODE_ENV !== 'production';

    // Auth + profile via cached fetcher (deduplicated within request)
    let ctx
    try {
      ctx = await requireCompanyAccessCached()
    } catch {
      return { success: false, error: 'Not authenticated' };
    }

    const rateLimit = await checkServerActionRateLimit(ctx.userId, 'createImportSession')
    if (!rateLimit.allowed) {
      return { success: false, error: rateLimit.error };
    }

    const supabase = await createClient();

    const mfa = await enforceMfaForPrivilegedUser(supabase, ctx.userId, undefined)
    if (mfa?.ok === false) {
      return { success: false, error: 'MFA required. Complete setup or verification to continue.' }
    }

    // Check entitlements - users must have bulk import enabled on their plan
    if (!isDev) {
      const canBulkImport = await checkBulkImportEntitlement(ctx.companyId, false)
      if (!canBulkImport) {
        return {
          success: false,
          error: 'Bulk import is not available on your current plan. Please upgrade to access this feature.',
        }
      }
    }

    // Extract form data
    const file = formData.get('file') as File | null;
    const format = formData.get('format') as ImportFormat | null;

    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    if (!format || !['employees', 'trips', 'gantt'].includes(format)) {
      return { success: false, error: 'Invalid import format' };
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Create import session
    const { data: session, error: insertError } = await supabase
      .from('import_sessions')
      .insert({
        company_id: ctx.companyId,
        user_id: ctx.userId,
        format,
        status: 'pending' as ImportStatus,
        file_name: file.name,
        file_size: file.size,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create import session:', insertError);
      return { success: false, error: 'Failed to create import session' };
    }

    revalidatePath('/import');

    return { success: true, session: dbRowToImportSession(session) };
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ============================================================
// GET IMPORT SESSION
// ============================================================

export async function getImportSession(sessionId: string): Promise<ImportSession | null> {
  try {
    const supabase = await createClient();

    // SECURITY: Get user's company for defense-in-depth validation
    // Even though RLS filters by company, we explicitly validate here
    // to prevent any potential RLS bypass
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .single();

    if (profileError || !profile?.company_id) {
      console.error('Could not determine user company');
      return null;
    }

    // Query with explicit company_id filter (defense-in-depth)
    const { data, error } = await supabase
      .from('import_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('company_id', profile.company_id)  // SECURITY: Explicit company check
      .single();

    if (error) {
      console.error('Failed to get import session:', error);
      return null;
    }

    return dbRowToImportSession(data);
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
}

// ============================================================
// GET RECENT IMPORT SESSIONS
// ============================================================

export async function getRecentImportSessions(limit = 10): Promise<ImportSession[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('import_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get import sessions:', error);
      return [];
    }

    return (data ?? []).map(dbRowToImportSession);
  } catch (error) {
    console.error('Get sessions error:', error);
    return [];
  }
}

// ============================================================
// GET IMPORT SESSIONS PAGINATED
// ============================================================

export interface PaginatedImportSessions {
  sessions: ImportSession[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export async function getImportSessionsPaginated(
  page = 1,
  perPage = 20
): Promise<PaginatedImportSessions> {
  try {
    const supabase = await createClient();

    // Get total count
    const { count, error: countError } = await supabase
      .from('import_sessions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['completed', 'failed']);

    if (countError) {
      console.error('Failed to count import sessions:', countError);
      return { sessions: [], total: 0, page, perPage, totalPages: 0 };
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / perPage);
    const offset = (page - 1) * perPage;

    // Get paginated data (only completed/failed sessions for history)
    const { data, error } = await supabase
      .from('import_sessions')
      .select('*')
      .in('status', ['completed', 'failed'])
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (error) {
      console.error('Failed to get import sessions:', error);
      return { sessions: [], total: 0, page, perPage, totalPages: 0 };
    }

    return {
      sessions: (data ?? []).map(dbRowToImportSession),
      total,
      page,
      perPage,
      totalPages,
    };
  } catch (error) {
    console.error('Get paginated sessions error:', error);
    return { sessions: [], total: 0, page, perPage, totalPages: 0 };
  }
}

// ============================================================
// UPDATE SESSION STATUS
// ============================================================

export async function updateSessionStatus(
  sessionId: string,
  status: ImportStatus,
  additionalData?: Partial<ImportSession>
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: session, error: sessionError } = await supabase
      .from('import_sessions')
      .select('company_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session?.company_id) {
      console.error('Failed to load import session for update:', sessionError);
      return false;
    }

    await requireCompanyAccess(supabase, session.company_id)

    const updateData: Record<string, unknown> = {
      status,
      ...additionalData,
    };

    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('import_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) {
      console.error('Failed to update session:', error);
      return false;
    }

    revalidatePath('/import');
    return true;
  } catch (error) {
    console.error('Update session error:', error);
    return false;
  }
}

// ============================================================
// SAVE PARSED DATA
// ============================================================

export async function saveParsedData(
  sessionId: string,
  parsedData: ParsedRow[],
  validRows: number,
  errorRows: number,
  validationErrors: ValidationError[]
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: session, error: sessionError } = await supabase
      .from('import_sessions')
      .select('company_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session?.company_id) {
      console.error('Failed to load import session for save:', sessionError);
      return false;
    }

    await requireCompanyAccess(supabase, session.company_id)

    const { error } = await supabase
      .from('import_sessions')
      .update({
        status: 'ready' as ImportStatus,
        parsed_data: parsedData as unknown as Json,
        total_rows: parsedData.length,
        valid_rows: validRows,
        error_rows: errorRows,
        validation_errors: validationErrors as unknown as Json,
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Failed to save parsed data:', error);
      return false;
    }

    revalidatePath('/import');
    return true;
  } catch (error) {
    console.error('Save parsed data error:', error);
    return false;
  }
}

// ============================================================
// EXECUTE IMPORT
// ============================================================

export async function executeImport(
  sessionId: string,
  duplicateOptions: DuplicateOptions = DEFAULT_DUPLICATE_OPTIONS
): Promise<ImportResult> {
  try {
    const supabase = await createClient()
    const isDev = process.env.NODE_ENV !== 'production'
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
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
            message: 'Not authenticated',
            severity: 'error',
          },
        ],
        warnings: [],
      }
    }

    const rateLimit = await checkServerActionRateLimit(user.id, 'executeImport')
    if (!rateLimit.allowed) {
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
            message: rateLimit.error ?? 'Rate limit exceeded',
            severity: 'error',
          },
        ],
        warnings: [],
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const mfa = await enforceMfaForPrivilegedUser(supabase, user.id, user.email)
    if (mfa?.ok === false) {
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
            message: 'MFA required. Complete setup or verification to continue.',
            severity: 'error',
          },
        ],
        warnings: [],
      }
    }

    const { data: session, error: sessionError } = await supabase
      .from('import_sessions')
      .select('company_id, format, parsed_data')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session?.parsed_data) {
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
            message: 'Import session not found or missing data',
            severity: 'error',
          },
        ],
        warnings: [],
      }
    }

    await requireCompanyAccess(supabase, session.company_id)

    if (!Array.isArray(session.parsed_data)) {
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
            message: 'Import session data is invalid',
            severity: 'error',
          },
        ],
        warnings: [],
      }
    }

    const format = session.format as ImportFormat
    const parsedRows = session.parsed_data as unknown as ParsedRow[]
    const validatedRows = await validateRows(parsedRows, format)
    const validRows = validatedRows.filter((row) => row.is_valid)

    if (validRows.length === 0) {
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
            message: 'There are no valid rows to import',
            severity: 'error',
          },
        ],
        warnings: [],
      }
    }

    // Import the inserter dynamically to avoid circular dependencies
    const { insertValidRows } = await import('@/lib/import/inserter');

    const result = await insertValidRows(sessionId, format, validatedRows, duplicateOptions);

    await updateSessionStatus(sessionId, result.success ? 'completed' : 'failed', {
      result,
    });

    revalidatePath('/dashboard');
    revalidatePath('/calendar');
    revalidatePath('/import');

    return result;
  } catch (error) {
    console.error('Import execution error:', error);

    await updateSessionStatus(sessionId, 'failed');

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
          message: 'An unexpected error occurred during import',
          severity: 'error',
        },
      ],
      warnings: [],
    };
  }
}

// ============================================================
// DELETE IMPORT SESSION
// ============================================================

export async function deleteImportSession(sessionId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: session, error: sessionError } = await supabase
      .from('import_sessions')
      .select('company_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session?.company_id) {
      console.error('Failed to load import session for delete:', sessionError);
      return false;
    }

    await requireCompanyAccess(supabase, session.company_id)

    const { error } = await supabase.from('import_sessions').delete().eq('id', sessionId);

    if (error) {
      console.error('Failed to delete import session:', error);
      return false;
    }

    revalidatePath('/import');
    return true;
  } catch (error) {
    console.error('Delete session error:', error);
    return false;
  }
}

// ============================================================
// COLUMN MAPPING ACTIONS
// ============================================================

// Helper to convert database row to SavedColumnMapping type
function dbRowToSavedMapping(row: {
  id: string;
  company_id: string;
  created_by: string;
  name: string;
  description: string | null;
  format: string;
  mappings: Json;
  times_used: number | null;
  last_used_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}): SavedColumnMapping {
  return {
    id: row.id,
    company_id: row.company_id,
    created_by: row.created_by,
    name: row.name,
    description: row.description,
    format: row.format as ImportFormat,
    mappings: row.mappings as Record<string, TargetField>,
    times_used: row.times_used ?? 0,
    last_used_at: row.last_used_at,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  };
}

/**
 * Loads saved column mappings for the current user's company.
 *
 * @param format - Optional filter by import format
 * @returns Array of saved mappings
 */
export async function loadSavedMappings(
  format?: ImportFormat
): Promise<SavedColumnMapping[]> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Not authenticated');
      return [];
    }

    // Query column_mappings (RLS will filter by company)
    let query = supabase.from('column_mappings').select('*');

    if (format) {
      query = query.eq('format', format);
    }

    const { data, error } = await query
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('times_used', { ascending: false });

    if (error) {
      console.error('Failed to load saved mappings:', error);
      return [];
    }

    return (data ?? []).map(dbRowToSavedMapping);
  } catch (error) {
    console.error('Load mappings error:', error);
    return [];
  }
}

/**
 * Saves a new column mapping.
 *
 * @param name - User-friendly name for the mapping
 * @param format - Import format this applies to
 * @param mappings - The column→field mappings
 * @param description - Optional description
 * @returns The created mapping or null on error
 */
export async function saveColumnMapping(
  name: string,
  format: ImportFormat,
  mappings: Record<string, TargetField>,
  description?: string
): Promise<SavedColumnMapping | null> {
  try {
    // Validate input
    const validationResult = SaveMappingInputSchema.safeParse({
      name,
      format,
      mappings,
      description,
    });

    if (!validationResult.success) {
      console.error('Invalid mapping data:', validationResult.error);
      return null;
    }

    const supabase = await createClient();

    // Get current user and company
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Not authenticated');
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      console.error('User profile not found');
      return null;
    }

    await requireCompanyAccess(supabase, profile.company_id)

    // Insert the mapping
    const { data, error } = await supabase
      .from('column_mappings')
      .insert({
        company_id: profile.company_id,
        created_by: user.id,
        name: validationResult.data.name,
        description: validationResult.data.description || null,
        format: validationResult.data.format,
        mappings: validationResult.data.mappings as unknown as Json,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save mapping:', error);
      return null;
    }

    revalidatePath('/settings/mappings');
    return dbRowToSavedMapping(data);
  } catch (error) {
    console.error('Save mapping error:', error);
    return null;
  }
}

/**
 * Deletes a saved column mapping.
 *
 * @param mappingId - ID of the mapping to delete
 * @returns true if successful
 */
export async function deleteColumnMapping(mappingId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: mapping, error: fetchError } = await supabase
      .from('column_mappings')
      .select('company_id')
      .eq('id', mappingId)
      .single();

    if (fetchError || !mapping?.company_id) {
      console.error('Failed to load column mapping for delete:', fetchError);
      return false;
    }

    await requireCompanyAccess(supabase, mapping.company_id)

    const { error } = await supabase
      .from('column_mappings')
      .delete()
      .eq('id', mappingId);

    if (error) {
      console.error('Failed to delete mapping:', error);
      return false;
    }

    revalidatePath('/settings/mappings');
    return true;
  } catch (error) {
    console.error('Delete mapping error:', error);
    return false;
  }
}

/**
 * Increments the usage count for a saved mapping.
 * Called when a saved mapping is applied during import.
 *
 * @param mappingId - ID of the mapping that was used
 * @returns true if successful
 */
export async function incrementMappingUsage(mappingId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Get current times_used, then increment
    const { data: current, error: fetchError } = await supabase
      .from('column_mappings')
      .select('times_used, company_id')
      .eq('id', mappingId)
      .single();

    if (fetchError) {
      console.error('Failed to fetch mapping:', fetchError);
      return false;
    }

    if (!current?.company_id) {
      console.error('Mapping has no company_id');
      return false;
    }

    await requireCompanyAccess(supabase, current.company_id)

    const currentTimesUsed = current?.times_used ?? 0;

    const { error: updateError } = await supabase
      .from('column_mappings')
      .update({
        times_used: currentTimesUsed + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', mappingId);

    if (updateError) {
      console.error('Failed to increment usage:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Increment usage error:', error);
    return false;
  }
}
