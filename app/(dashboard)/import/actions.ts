'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Json } from '@/types/database';
import {
  ImportFormat,
  ImportSession,
  ImportResult,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  ValidatedRow,
  ParsedRow,
  UploadResult,
  ImportStatus,
  ValidationError,
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

async function checkBulkImportEntitlement(companyId: string): Promise<boolean> {
  const supabase = await createClient();

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
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get user's company
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return { success: false, error: 'User profile not found' };
    }

    // Check entitlements
    const canBulkImport = await checkBulkImportEntitlement(profile.company_id);
    if (!canBulkImport) {
      return {
        success: false,
        error: 'Bulk import is not available on your current plan. Please upgrade to access this feature.',
      };
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
        company_id: profile.company_id,
        user_id: user.id,
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

    const { data, error } = await supabase
      .from('import_sessions')
      .select('*')
      .eq('id', sessionId)
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
// UPDATE SESSION STATUS
// ============================================================

export async function updateSessionStatus(
  sessionId: string,
  status: ImportStatus,
  additionalData?: Partial<ImportSession>
): Promise<boolean> {
  try {
    const supabase = await createClient();

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
  format: ImportFormat,
  rows: ValidatedRow<ParsedRow>[]
): Promise<ImportResult> {
  try {
    // Import the inserter dynamically to avoid circular dependencies
    const { insertValidRows } = await import('@/lib/import/inserter');

    const result = await insertValidRows(sessionId, format, rows);

    await updateSessionStatus(sessionId, result.success ? 'completed' : 'failed', {
      result,
    });

    revalidatePath('/dashboard');
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
