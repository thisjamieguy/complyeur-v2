'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import {
  createJobWithTrips,
  getEmployeeById,
  removeJobTrip,
  updateJobTrip,
  updateJobWithTrips,
  type JobTripError,
} from '@/lib/db'
import {
  jobCreateSchema,
  jobTripUpdateSchema,
  jobUpdateSchema,
  type JobCreateData,
  type JobTripUpdateData,
  type JobUpdateData,
} from '@/lib/validations/job'
import { createClient } from '@/lib/supabase/server'
import { requireMutationPermission } from '@/lib/security/authorization'
import { checkServerActionRateLimit } from '@/lib/rate-limit'
import { PERMISSIONS, type Permission } from '@/lib/permissions'
import { detectAndProcessAlerts } from '@/lib/services/alert-detection-service'

export interface JobActionResult {
  success: boolean
  jobId?: string
  errors?: JobTripError[]
  error?: string
}

async function enforceMutationAccess(
  permission: Permission,
  actionName: string
): Promise<void> {
  const supabase = await createClient()
  const access = await requireMutationPermission(supabase, permission, actionName)

  if (!access.allowed) {
    throw new Error(access.error)
  }

  const rateLimit = await checkServerActionRateLimit(access.user.id, actionName)
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.error ?? 'Rate limit exceeded')
  }
}

async function runAlertDetection(employeeId: string): Promise<void> {
  try {
    const employee = await getEmployeeById(employeeId)
    if (!employee) return

    await detectAndProcessAlerts({
      employeeId: employee.id,
      employeeName: employee.name,
      companyId: employee.company_id,
    })
  } catch (error) {
    console.error('[Jobs] Alert detection failed:', error)
  }
}

function runAlertDetectionBackground(employeeIds: string[]): void {
  const uniqueEmployeeIds = Array.from(new Set(employeeIds))
  after(async () => {
    await Promise.all(uniqueEmployeeIds.map((employeeId) => runAlertDetection(employeeId)))
  })
}

function revalidateJobData(jobId?: string): void {
  revalidatePath('/jobs')
  if (jobId) {
    revalidatePath(`/jobs/${jobId}`)
  }
  revalidatePath('/dashboard')
  revalidatePath('/calendar')
  revalidatePath('/future-job-alerts')
  revalidatePath('/trip-forecast')
}

function getValidationMessage(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'issues' in error &&
    Array.isArray(error.issues) &&
    error.issues.length > 0
  ) {
    const firstIssue = error.issues[0] as { message?: string }
    return firstIssue.message ?? 'Check the job details and try again'
  }

  return error instanceof Error ? error.message : 'Something went wrong'
}

export async function createJobAction(
  formData: JobCreateData
): Promise<JobActionResult> {
  try {
    await enforceMutationAccess(PERMISSIONS.JOBS_CREATE, 'createJobAction')
    const validated = jobCreateSchema.parse(formData)
    const result = await createJobWithTrips(validated)

    if (result.errors?.length) {
      return { success: false, errors: result.errors }
    }

    if (!result.job) {
      return { success: false, error: 'Failed to create job' }
    }

    runAlertDetectionBackground(validated.employees.map((employee) => employee.employee_id))
    revalidateJobData(result.job.id)

    return { success: true, jobId: result.job.id }
  } catch (error) {
    return { success: false, error: getValidationMessage(error) }
  }
}

export async function updateJobAction(
  jobId: string,
  formData: JobUpdateData
): Promise<JobActionResult> {
  try {
    await enforceMutationAccess(PERMISSIONS.JOBS_UPDATE, 'updateJobAction')
    const validated = jobUpdateSchema.parse(formData)
    const result = await updateJobWithTrips(jobId, validated)

    if (result.errors?.length) {
      return { success: false, errors: result.errors }
    }

    revalidateJobData(jobId)

    return { success: true, jobId: result.job.id }
  } catch (error) {
    return { success: false, error: getValidationMessage(error) }
  }
}

export async function updateJobTripAction(
  jobId: string,
  tripId: string,
  formData: JobTripUpdateData
): Promise<JobActionResult> {
  try {
    await enforceMutationAccess(PERMISSIONS.JOBS_UPDATE, 'updateJobTripAction')
    const validated = jobTripUpdateSchema.parse(formData)
    const result = await updateJobTrip(jobId, tripId, validated)

    if (result.errors?.length) {
      return { success: false, errors: result.errors }
    }

    runAlertDetectionBackground([result.trip.employee_id])
    revalidateJobData(jobId)

    return { success: true, jobId }
  } catch (error) {
    return { success: false, error: getValidationMessage(error) }
  }
}

export async function removeJobTripAction(
  jobId: string,
  tripId: string,
  employeeId: string
): Promise<JobActionResult> {
  try {
    await enforceMutationAccess(PERMISSIONS.JOBS_UPDATE, 'removeJobTripAction')
    await removeJobTrip(jobId, tripId)

    runAlertDetectionBackground([employeeId])
    revalidateJobData(jobId)

    return { success: true, jobId }
  } catch (error) {
    return { success: false, error: getValidationMessage(error) }
  }
}
