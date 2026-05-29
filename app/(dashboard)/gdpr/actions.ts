'use server'

import { revalidatePath } from 'next/cache'
import {
  generateDsarExport,
  softDeleteEmployee,
  restoreEmployee,
  getDeletedEmployees,
  anonymizeEmployee,
  getGdprAuditLog,
  getRetentionStats,
  type DeletedEmployee,
  type RetentionStats,
} from '@/lib/gdpr'
import { createClient } from '@/lib/supabase/server'
import {
  employeeIdSchema,
  gdprAnonymizationSchema,
  gdprDeletionSchema,
} from '@/lib/validations/gdpr'
import { checkServerActionRateLimit } from '@/lib/rate-limit'
import { isOwnerOrAdmin } from '@/lib/permissions'
import { requireCompanyAccessCached } from '@/lib/security/tenant-access'
import {
  cleanupExpiredGdprExportArchives,
  storeGdprExportArchive,
} from '@/lib/gdpr/export-storage'

interface GdprPageData {
  hasAccess: boolean
  employees: Array<{ id: string; name: string; isAnonymized: boolean }>
  deletedEmployees: DeletedEmployee[]
  auditLog: Array<{
    id: string
    action: string
    entityType: string
    entityId: string | null
    details: Record<string, unknown> | null
    userId: string | null
    createdAt: string
  }>
  retentionStats: RetentionStats | null
}

/**
 * Gets all employees for the GDPR tools page.
 * Excludes soft-deleted and anonymized employees.
 */
export async function getEmployeesForGdpr(): Promise<
  Array<{ id: string; name: string; isAnonymized: boolean }>
> {
  const ctx = await requireCompanyAccessCached()

  const rateLimit = await checkServerActionRateLimit(ctx.userId, 'getEmployeesForGdpr')
  if (!rateLimit.allowed) {
    return []
  }

  if (!isOwnerOrAdmin(ctx.role)) {
    return []
  }

  const supabase = await createClient()

  // First try with GDPR columns (deleted_at, anonymized_at)
  let employees: { id: string; name: string; anonymized_at?: string | null }[] | null = null
  let error: Error | null = null

  const result = await supabase
    .from('employees')
    .select('id, name, anonymized_at, deleted_at')
    .eq('company_id', ctx.companyId)
    .is('deleted_at', null)
    .order('name')

  if (result.error) {
    // If query fails (columns might not exist), fallback to basic query
    console.warn('[GDPR] GDPR columns may not exist, falling back to basic query:', result.error.message)
    const fallback = await supabase
      .from('employees')
      .select('id, name')
      .eq('company_id', ctx.companyId)
      .order('name')

    employees = fallback.data
    error = fallback.error
  } else {
    employees = result.data
    error = result.error
  }

  if (error) {
    console.error('[GDPR] Failed to fetch employees:', error)
    return []
  }

  return (employees ?? []).map((emp) => ({
    id: emp.id,
    name: emp.name,
    isAnonymized: !!(emp as Record<string, unknown>).anonymized_at,
  }))
}

/**
 * Loads initial GDPR page data with a single permission and rate-limit check.
 * The individual server actions remain rate-limited for client-triggered
 * mutations and refreshes.
 */
export async function getGdprPageData(): Promise<GdprPageData> {
  try {
    const ctx = await requireCompanyAccessCached()

    const rateLimit = await checkServerActionRateLimit(ctx.userId, 'getGdprPageData')
    if (!rateLimit.allowed || !isOwnerOrAdmin(ctx.role)) {
      return {
        hasAccess: false,
        employees: [],
        deletedEmployees: [],
        auditLog: [],
        retentionStats: null,
      }
    }

    const supabase = await createClient()

    const employeesPromise = supabase
      .from('employees')
      .select('id, name, anonymized_at, deleted_at')
      .eq('company_id', ctx.companyId)
      .is('deleted_at', null)
      .order('name')

    const [employeesResult, deletedEmployees, auditLog, retentionStats] = await Promise.all([
      employeesPromise,
      getDeletedEmployees(),
      getGdprAuditLog(ctx.companyId, { limit: 10 }),
      getRetentionStats(),
    ])

    let employees = employeesResult.data
    let employeeError = employeesResult.error

    if (employeeError) {
      console.warn('[GDPR] GDPR columns may not exist, falling back to basic query:', employeeError.message)
      const fallback = await supabase
        .from('employees')
        .select('id, name')
        .eq('company_id', ctx.companyId)
        .order('name')

      employees = fallback.data as typeof employees
      employeeError = fallback.error
    }

    if (employeeError) {
      console.error('[GDPR] Failed to fetch employees:', employeeError)
    }

    return {
      hasAccess: true,
      employees: (employees ?? []).map((emp) => ({
        id: emp.id,
        name: emp.name,
        isAnonymized: !!(emp as Record<string, unknown>).anonymized_at,
      })),
      deletedEmployees,
      auditLog,
      retentionStats,
    }
  } catch {
    return {
      hasAccess: false,
      employees: [],
      deletedEmployees: [],
      auditLog: [],
      retentionStats: null,
    }
  }
}

// Maximum size for base64 export (5MB) - larger exports should use storage
const MAX_BASE64_EXPORT_SIZE = 5 * 1024 * 1024

/**
 * Generates a DSAR export for an employee.
 * Returns the download URL or error.
 *
 * For small exports (<5MB): Returns base64 data URL for immediate download
 * For large exports: Uploads to Supabase storage and returns signed URL
 */
export async function requestDsarExport(employeeId: string): Promise<{
  success: boolean
  downloadUrl?: string
  fileName?: string
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return {
      success: false,
      error: 'Unauthorized',
    }
  }

  const rateLimit = await checkServerActionRateLimit(user.id, 'requestDsarExport')
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: rateLimit.error,
    }
  }

  // Validate employee ID format
  const idResult = employeeIdSchema.safeParse(employeeId)
  if (!idResult.success) {
    return {
      success: false,
      error: 'Invalid employee ID format',
    }
  }

  const result = await generateDsarExport(idResult.data)

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    }
  }

  const zipSize = result.zipBuffer.length

  // For large exports, use a private Supabase storage bucket with short-lived signed URLs
  if (zipSize > MAX_BASE64_EXPORT_SIZE) {
    try {
      await cleanupExpiredGdprExportArchives()
      const { signedUrl } = await storeGdprExportArchive(result.zipBuffer, result.fileName)

      revalidatePath('/gdpr')
      return {
        success: true,
        downloadUrl: signedUrl,
        fileName: result.fileName,
      }
    } catch (storageError) {
      // If secure storage fails, warn but continue with base64 fallback where possible.
      console.warn('[DSAR Export] Secure storage upload failed, falling back to inline download.', storageError)
    }
  }

  // For small exports or if storage failed, use base64 encoding
  // Add size check to prevent memory issues
  if (zipSize > 10 * 1024 * 1024) {
    return {
      success: false,
      error: 'Export file is too large. Please contact support for assistance with large data exports.',
    }
  }

  const base64 = result.zipBuffer.toString('base64')

  revalidatePath('/gdpr')

  return {
    success: true,
    downloadUrl: `data:application/zip;base64,${base64}`,
    fileName: result.fileName,
  }
}

/**
 * Soft deletes an employee with 30-day recovery period.
 */
export async function deleteEmployeeGdpr(
  employeeId: string,
  reason?: string
): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  const ctx = await requireCompanyAccessCached()

  const rateLimit = await checkServerActionRateLimit(ctx.userId, 'deleteEmployeeGdpr')
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.error ?? 'Rate limit exceeded' }
  }

  const validation = gdprDeletionSchema.safeParse({ employeeId, reason })
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? 'Invalid deletion request',
    }
  }

  const result = await softDeleteEmployee(validation.data.employeeId, validation.data.reason)

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    }
  }

  revalidatePath('/gdpr')
  revalidatePath('/dashboard')

  return {
    success: true,
    message: `${result.employeeName} has been deleted. They can be restored until ${result.scheduledHardDelete}.`,
  }
}

/**
 * Restores a soft-deleted employee.
 */
export async function restoreEmployeeGdpr(employeeId: string): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  const ctx = await requireCompanyAccessCached()

  const rateLimit = await checkServerActionRateLimit(ctx.userId, 'restoreEmployeeGdpr')
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.error ?? 'Rate limit exceeded' }
  }

  // Validate employee ID format
  const idResult = employeeIdSchema.safeParse(employeeId)
  if (!idResult.success) {
    return {
      success: false,
      error: 'Invalid employee ID format',
    }
  }

  const result = await restoreEmployee(idResult.data)

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    }
  }

  revalidatePath('/gdpr')
  revalidatePath('/dashboard')

  return {
    success: true,
    message: `${result.employeeName} has been restored.`,
  }
}

/**
 * Gets all soft-deleted employees for the recovery UI.
 */
export async function getDeletedEmployeesAction(): Promise<DeletedEmployee[]> {
  const ctx = await requireCompanyAccessCached()

  const rateLimit = await checkServerActionRateLimit(ctx.userId, 'getDeletedEmployeesAction')
  if (!rateLimit.allowed) {
    return []
  }

  return getDeletedEmployees()
}

/**
 * Anonymizes an employee (irreversible).
 */
export async function anonymizeEmployeeGdpr(
  employeeId: string,
  reason?: string
): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  const ctx = await requireCompanyAccessCached()

  const rateLimit = await checkServerActionRateLimit(ctx.userId, 'anonymizeEmployeeGdpr')
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.error ?? 'Rate limit exceeded' }
  }

  const validation = gdprAnonymizationSchema.safeParse({ employeeId, reason })
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? 'Invalid anonymization request',
    }
  }

  const result = await anonymizeEmployee(validation.data.employeeId, validation.data.reason)

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    }
  }

  revalidatePath('/gdpr')
  revalidatePath('/dashboard')

  return {
    success: true,
    message: `${result.originalName} has been anonymized to ${result.anonymizedName}. ${result.tripsPreserved} trips preserved.`,
  }
}

/**
 * Gets the GDPR audit log for display.
 */
export async function getGdprAuditLogAction(options?: {
  limit?: number
  offset?: number
}): Promise<
  Array<{
    id: string
    action: string
    entityType: string
    entityId: string | null
    details: Record<string, unknown> | null
    userId: string | null
    createdAt: string
  }>
> {
  const { userId, companyId, role } = await requireCompanyAccessCached()

  const rateLimit = await checkServerActionRateLimit(userId, 'getGdprAuditLogAction')
  if (!rateLimit.allowed) {
    return []
  }

  if (!isOwnerOrAdmin(role)) {
    return []
  }

  return getGdprAuditLog(companyId, options)
}

/**
 * Gets retention statistics for the dashboard.
 */
export async function getRetentionStatsAction(): Promise<RetentionStats | null> {
  const ctx = await requireCompanyAccessCached()

  const rateLimit = await checkServerActionRateLimit(ctx.userId, 'getRetentionStatsAction')
  if (!rateLimit.allowed) {
    return null
  }

  return getRetentionStats()
}

/**
 * Checks if the current user is an owner or admin.
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { userId, role } = await requireCompanyAccessCached()

    const rateLimit = await checkServerActionRateLimit(userId, 'isAdmin')
    if (!rateLimit.allowed) {
      return false
    }

    return isOwnerOrAdmin(role)
  } catch {
    return false
  }
}
