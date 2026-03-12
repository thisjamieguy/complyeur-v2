'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  createFeedbackSubmission,
  createTrip,
  updateTrip,
  deleteTrip,
  createBulkTrips,
  reassignTrip,
  getEmployeeById,
} from '@/lib/db'
import { employeeSchema, employeeWithTripsSchema } from '@/lib/validations/employee'
import {
  feedbackSubmissionSchema,
  type FeedbackSubmissionFormData,
} from '@/lib/validations/feedback'
import { tripSchema, tripUpdateSchema } from '@/lib/validations/trip'
import { detectAndProcessAlerts } from '@/lib/services/alert-detection-service'
import {
  getActiveAlerts,
  getUnacknowledgedAlerts,
  acknowledgeAlert,
  resolveAlert,
  getCompanySettings,
  updateCompanySettings,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/db/alerts'
import type { TripCreateInput, TripUpdate, CompanySettingsUpdate, NotificationPreferencesUpdate, AlertWithEmployee, CompanySettings, NotificationPreferences, BulkTripInput } from '@/types/database-helpers'
import { checkServerActionRateLimit } from '@/lib/rate-limit'
import { PERMISSIONS, type Permission } from '@/lib/permissions'
import { requireMutationPermission } from '@/lib/security/authorization'
import { requireCompanyAccessCached } from '@/lib/security/tenant-access'

/**
 * Helper to run alert detection after trip changes
 * Runs in background (fire-and-forget) to not block UI
 */
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
    // Log but don't throw - alert detection should not block trip operations
    console.error('[AlertDetection] Error in background detection:', error)
  }
}

/**
 * Schedule alert detection to run after the response is sent.
 * Uses Next.js after() to keep the serverless function alive for the background work,
 * avoiding the fire-and-forget pattern where promises can be dropped.
 */
function runAlertDetectionBackground(employeeId: string): void {
  after(() => runAlertDetection(employeeId))
}

/**
 * Revalidate all paths that display trip/employee data.
 * IMPORTANT: Always use this helper instead of individual revalidatePath calls
 * to ensure calendar, dashboard, and other views stay in sync.
 */
function revalidateTripData(employeeId?: string): void {
  revalidatePath('/dashboard')
  if (employeeId) {
    revalidatePath(`/employee/${employeeId}`)
  }
}

async function enforceMutationAccess(
  permission: Permission,
  actionName: string
): Promise<{ userId: string }> {
  const supabase = await createClient()
  const access = await requireMutationPermission(supabase, permission, actionName)

  if (!access.allowed) {
    throw new Error(access.error)
  }

  const rateLimit = await checkServerActionRateLimit(access.user.id, actionName)
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.error ?? 'Rate limit exceeded')
  }

  return { userId: access.user.id }
}

export async function addEmployeeAction(formData: { name: string; nationality_type?: string }) {
  await enforceMutationAccess(PERMISSIONS.EMPLOYEES_CREATE, 'addEmployeeAction')
  const validated = employeeSchema.parse(formData)
  await createEmployee(validated)
  revalidateTripData()
}

/**
 * Add an employee with optional trips in a single action.
 * Used by the unified add-employee dialog.
 */
export async function addEmployeeWithTripsAction(formData: {
  name: string
  nationality_type: string
  trips?: Array<{
    entry_date: string
    exit_date: string
    country: string
    is_private?: boolean
  }>
}): Promise<{ employeeId: string; tripsCreated: number }> {
  await enforceMutationAccess(PERMISSIONS.EMPLOYEES_CREATE, 'addEmployeeWithTripsAction')

  const validated = employeeWithTripsSchema.parse(formData)

  // Create the employee
  const employee = await createEmployee({
    name: validated.name,
    nationality_type: validated.nationality_type,
  })

  if (!employee?.id) {
    throw new Error('Failed to create employee')
  }

  // Filter out incomplete trip entries (user left fields blank)
  const completedTrips = (validated.trips || []).filter(
    (t) => t.entry_date && t.exit_date && t.country
  )

  let tripsCreated = 0

  if (completedTrips.length > 0) {
    // Validate each trip fully with tripSchema
    const tripInputs: BulkTripInput[] = completedTrips.map((t) => {
      const validated = tripSchema.parse({
        employee_id: employee.id,
        entry_date: t.entry_date,
        exit_date: t.exit_date,
        country: t.country,
        is_private: t.is_private,
      })
      return {
        employee_id: validated.employee_id,
        country: validated.country,
        entry_date: validated.entry_date,
        exit_date: validated.exit_date,
        is_private: validated.is_private,
      }
    })

    const result = await createBulkTrips(tripInputs)
    tripsCreated = result.created

    // Run alert detection in background
    runAlertDetectionBackground(employee.id)
  }

  revalidateTripData(employee.id)
  return { employeeId: employee.id, tripsCreated }
}

export async function updateEmployeeAction(id: string, formData: { name: string; nationality_type?: string }) {
  await enforceMutationAccess(PERMISSIONS.EMPLOYEES_UPDATE, 'updateEmployeeAction')
  const validated = employeeSchema.parse(formData)
  await updateEmployee(id, validated)
  revalidateTripData(id)
}

export async function deleteEmployeeAction(id: string) {
  await enforceMutationAccess(PERMISSIONS.EMPLOYEES_DELETE, 'deleteEmployeeAction')
  await deleteEmployee(id)
  revalidateTripData(id)
}

export async function submitFeedbackAction(
  formData: FeedbackSubmissionFormData
): Promise<{ ok: true }> {
  const validated = feedbackSubmissionSchema.parse(formData)
  const { userId } = await requireCompanyAccessCached()

  const rateLimit = await checkServerActionRateLimit(userId, 'submitFeedbackAction')
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.error ?? 'Rate limit exceeded')
  }

  await createFeedbackSubmission(validated)

  return { ok: true }
}

// Trip actions

export async function addTripAction(formData: {
  employee_id: string
  country: string
  entry_date: string
  exit_date: string
  purpose?: string
  job_ref?: string
  is_private?: boolean
  ghosted?: boolean
}) {
  await enforceMutationAccess(PERMISSIONS.TRIPS_CREATE, 'addTripAction')
  const validated = tripSchema.parse(formData)
  const tripData: TripCreateInput = {
    employee_id: validated.employee_id,
    country: validated.country,
    entry_date: validated.entry_date,
    exit_date: validated.exit_date,
    purpose: validated.purpose,
    job_ref: validated.job_ref,
    is_private: validated.is_private,
    ghosted: validated.ghosted,
  }
  const trip = await createTrip(tripData)

  // Run alert detection after trip creation (fire-and-forget)
  runAlertDetectionBackground(validated.employee_id)

  revalidateTripData(validated.employee_id)
  return trip
}

export async function updateTripAction(
  tripId: string,
  employeeId: string,
  formData: {
    country?: string
    entry_date?: string
    exit_date?: string
    purpose?: string | null
    job_ref?: string | null
    is_private?: boolean
    ghosted?: boolean
  }
) {
  await enforceMutationAccess(PERMISSIONS.TRIPS_UPDATE, 'updateTripAction')
  const validated = tripUpdateSchema.parse(formData)
  const updateData: TripUpdate = {}

  if (validated.country !== undefined) updateData.country = validated.country
  if (validated.entry_date !== undefined) updateData.entry_date = validated.entry_date
  if (validated.exit_date !== undefined) updateData.exit_date = validated.exit_date
  if (validated.purpose !== undefined) updateData.purpose = validated.purpose
  if (validated.job_ref !== undefined) updateData.job_ref = validated.job_ref
  if (validated.is_private !== undefined) updateData.is_private = validated.is_private
  if (validated.ghosted !== undefined) updateData.ghosted = validated.ghosted

  const trip = await updateTrip(tripId, updateData)

  // Run alert detection after trip update (fire-and-forget)
  runAlertDetectionBackground(employeeId)

  revalidateTripData(employeeId)
  return trip
}

export async function deleteTripAction(tripId: string, employeeId: string) {
  await enforceMutationAccess(PERMISSIONS.TRIPS_DELETE, 'deleteTripAction')
  await deleteTrip(tripId)

  // Run alert detection after trip deletion (may resolve alerts)
  runAlertDetectionBackground(employeeId)

  revalidateTripData(employeeId)
}

// Bulk trip creation
interface BulkTripResult {
  success: boolean
  created: number
  errors?: { index: number; message: string }[]
}

/**
 * Bulk add trips with full Zod validation.
 * Atomic behavior: if any trip fails validation, none are inserted.
 */
export async function bulkAddTripsAction(
  trips: BulkTripInput[]
): Promise<BulkTripResult> {
  const supabase = await createClient()
  const access = await requireMutationPermission(
    supabase,
    PERMISSIONS.TRIPS_CREATE,
    'bulkAddTripsAction'
  )
  if (!access.allowed) {
    return { success: false, created: 0, errors: [{ index: 0, message: access.error }] }
  }

  const rateLimit = await checkServerActionRateLimit(access.user.id, 'bulkAddTripsAction')
  if (!rateLimit.allowed) {
    return { success: false, created: 0, errors: [{ index: 0, message: rateLimit.error ?? 'Rate limit exceeded' }] }
  }

  if (!trips || trips.length === 0) {
    return { success: false, created: 0, errors: [{ index: 0, message: 'No trips provided' }] }
  }

  if (trips.length > 20) {
    return { success: false, created: 0, errors: [{ index: 0, message: 'Maximum 20 trips per batch' }] }
  }

  // Validate all trips through tripSchema before processing any
  const validationErrors: { index: number; message: string }[] = []
  const validatedTrips: BulkTripInput[] = []

  for (let i = 0; i < trips.length; i++) {
    const trip = trips[i]
    const result = tripSchema.safeParse(trip)

    if (!result.success) {
      // Collect all validation errors for this trip
      const errors = result.error.issues.map((err) => {
        const field = err.path.join('.')
        return field ? `${field}: ${err.message}` : err.message
      }).join('; ')
      validationErrors.push({ index: i, message: errors })
    } else {
      // Store validated data for later insertion
      validatedTrips.push({
        employee_id: result.data.employee_id,
        country: result.data.country,
        entry_date: result.data.entry_date,
        exit_date: result.data.exit_date,
        purpose: result.data.purpose,
        job_ref: result.data.job_ref,
        is_private: result.data.is_private,
        ghosted: result.data.ghosted,
      })
    }
  }

  // If any trip failed validation, return errors and do NOT insert anything (atomic)
  if (validationErrors.length > 0) {
    return { success: false, created: 0, errors: validationErrors }
  }

  // All trips validated successfully, proceed with insertion
  const employeeId = validatedTrips[0].employee_id
  const result = await createBulkTrips(validatedTrips)

  // Run alert detection after bulk trip creation (fire-and-forget)
  runAlertDetectionBackground(employeeId)

  revalidateTripData(employeeId)

  return { success: true, ...result }
}

// Trip reassignment
export async function reassignTripAction(
  tripId: string,
  currentEmployeeId: string,
  newEmployeeId: string
): Promise<void> {
  await enforceMutationAccess(PERMISSIONS.TRIPS_UPDATE, 'reassignTripAction')
  await reassignTrip(tripId, newEmployeeId)

  // Run alert detection for both employees (trip removed from one, added to other)
  runAlertDetectionBackground(currentEmployeeId)
  runAlertDetectionBackground(newEmployeeId)

  revalidateTripData(currentEmployeeId)
  revalidatePath(`/employee/${newEmployeeId}`)
}

// ============================================================================
// ALERT ACTIONS
// ============================================================================

/**
 * Get all active (unresolved) alerts for the company
 */
export async function getActiveAlertsAction(): Promise<AlertWithEmployee[]> {
  await requireCompanyAccessCached()
  return getActiveAlerts()
}

/**
 * Get unacknowledged alerts (for dashboard banner)
 */
export async function getUnacknowledgedAlertsAction(): Promise<AlertWithEmployee[]> {
  await requireCompanyAccessCached()
  return getUnacknowledgedAlerts()
}

/**
 * Acknowledge an alert (mark as read)
 */
export async function acknowledgeAlertAction(alertId: string): Promise<void> {
  await enforceMutationAccess(PERMISSIONS.ALERTS_MANAGE, 'acknowledgeAlertAction')
  await acknowledgeAlert(alertId)
  revalidatePath('/dashboard')
}

/**
 * Resolve an alert
 */
export async function resolveAlertAction(alertId: string): Promise<void> {
  await enforceMutationAccess(PERMISSIONS.ALERTS_MANAGE, 'resolveAlertAction')
  await resolveAlert(alertId)
  revalidatePath('/dashboard')
}

// ============================================================================
// COMPANY SETTINGS ACTIONS
// ============================================================================

/**
 * Get company notification settings
 */
export async function getCompanySettingsAction(): Promise<CompanySettings> {
  await requireCompanyAccessCached()
  return getCompanySettings()
}

/**
 * Update company notification settings
 */
export async function updateCompanySettingsAction(
  updates: CompanySettingsUpdate
): Promise<CompanySettings> {
  await enforceMutationAccess(PERMISSIONS.SETTINGS_UPDATE, 'updateCompanySettingsAction')
  const settings = await updateCompanySettings(updates)
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return settings
}

// ============================================================================
// USER NOTIFICATION PREFERENCES ACTIONS
// ============================================================================

/**
 * Get user's notification preferences
 */
export async function getNotificationPreferencesAction(): Promise<NotificationPreferences> {
  await requireCompanyAccessCached()
  return getNotificationPreferences()
}

/**
 * Update user's notification preferences.
 * Intentionally skips SETTINGS_UPDATE permission — these are personal
 * per-user preferences, not company-wide settings. Any authenticated
 * user (including viewers) may change their own notification prefs.
 */
export async function updateNotificationPreferencesAction(
  updates: NotificationPreferencesUpdate
): Promise<NotificationPreferences> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const rateCheck = await checkServerActionRateLimit(user.id, 'updateNotificationPreferences')
  if (!rateCheck.allowed) throw new Error(rateCheck.error || 'Too many requests')

  const prefs = await updateNotificationPreferences(updates)
  revalidatePath('/settings')
  return prefs
}

// ============================================================================
// RESET POPUPS & TOURS
// ============================================================================

/**
 * Reset all dismissed popups, tours, and alert acknowledgments so the user
 * can review them again. Resets:
 * - Dashboard tour completion flag
 * - All alert acknowledgments (marks them as unread)
 */
export async function resetPopupsAndToursAction(): Promise<{ tourReset: boolean; alertsReset: number }> {
  const { userId, companyId } = await requireCompanyAccessCached()

  const rateCheck = await checkServerActionRateLimit(userId, 'resetPopupsAndTours')
  if (!rateCheck.allowed) throw new Error(rateCheck.error || 'Too many requests')

  const supabase = await createClient()

  // 1. Reset dashboard tour
  const { error: tourError } = await supabase
    .from('profiles')
    .update({ dashboard_tour_completed_at: null })
    .eq('id', userId)

  if (tourError) {
    console.error('[resetPopups] Failed to reset tour:', tourError)
  }

  // 2. Un-acknowledge all alerts for this company
  const { data: resetAlerts, error: alertError } = await supabase
    .from('alerts')
    .update({
      acknowledged: false,
      acknowledged_at: null,
      acknowledged_by: null,
    })
    .eq('company_id', companyId)
    .eq('acknowledged', true)
    .eq('resolved', false)
    .select('id')

  if (alertError) {
    console.error('[resetPopups] Failed to reset alerts:', alertError)
  }

  revalidatePath('/dashboard')
  revalidatePath('/settings')

  return {
    tourReset: !tourError,
    alertsReset: resetAlerts?.length ?? 0,
  }
}
