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
import { employeeIdSchema } from '@/lib/validations/gdpr'
import { checkServerActionRateLimit } from '@/lib/rate-limit'

/**
 * Gets all employees for the GDPR tools page.
 * Excludes soft-deleted and anonymized employees.
 */
export async function getEmployeesForGdpr(): Promise<
  Array<{ id: string; name: string; isAnonymized: boolean }>
> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .single()

  if (!profile?.company_id || profile.role !== 'admin') {
    return []
  }

  // First try with GDPR columns (deleted_at, anonymized_at)
  let employees: { id: string; name: string; anonymized_at?: string | null }[] | null = null
  let error: Error | null = null

  const result = await supabase
    .from('employees')
    .select('id, name, anonymized_at, deleted_at')
    .eq('company_id', profile.company_id)
    .is('deleted_at', null)
    .order('name')

  if (result.error) {
    // If query fails (columns might not exist), fallback to basic query
    console.warn('[GDPR] GDPR columns may not exist, falling back to basic query:', result.error.message)
    const fallback = await supabase
      .from('employees')
      .select('id, name')
      .eq('company_id', profile.company_id)
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

  // For large exports, try to use Supabase storage
  if (zipSize > MAX_BASE64_EXPORT_SIZE) {
    const exportId = crypto.randomUUID()
    const storagePath = `dsar-exports/${exportId}/${result.fileName}`

    // Try to upload to storage bucket
    const { error: uploadError } = await supabase.storage
      .from('gdpr-exports')
      .upload(storagePath, result.zipBuffer, {
        contentType: 'application/zip',
        cacheControl: '300', // 5 minute cache
      })

    if (!uploadError) {
      // Generate signed URL (expires in 1 hour)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('gdpr-exports')
        .createSignedUrl(storagePath, 3600)

      if (!signedUrlError && signedUrlData?.signedUrl) {
        revalidatePath('/gdpr')
        return {
          success: true,
          downloadUrl: signedUrlData.signedUrl,
          fileName: result.fileName,
        }
      }
    }

    // If storage upload failed, warn but continue with base64 fallback
    console.warn(
      '[DSAR Export] Storage upload failed, falling back to base64. ' +
      'Consider setting up gdpr-exports storage bucket for large exports.',
      uploadError
    )
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
  // Validate employee ID format
  const idResult = employeeIdSchema.safeParse(employeeId)
  if (!idResult.success) {
    return {
      success: false,
      error: 'Invalid employee ID format',
    }
  }

  const result = await softDeleteEmployee(idResult.data, reason)

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
  // Validate employee ID format
  const idResult = employeeIdSchema.safeParse(employeeId)
  if (!idResult.success) {
    return {
      success: false,
      error: 'Invalid employee ID format',
    }
  }

  const result = await anonymizeEmployee(idResult.data, reason)

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
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .single()

  if (!profile?.company_id || profile.role !== 'admin') {
    return []
  }

  return getGdprAuditLog(profile.company_id, options)
}

/**
 * Gets retention statistics for the dashboard.
 */
export async function getRetentionStatsAction(): Promise<RetentionStats | null> {
  return getRetentionStats()
}

/**
 * Checks if the current user is an admin.
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .single()

  return profile?.role === 'admin'
}
