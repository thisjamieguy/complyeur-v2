'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  createTrip,
  updateTrip,
  deleteTrip,
  createBulkTrips,
  reassignTrip,
  getEmployeeById,
} from '@/lib/db'
import { employeeSchema } from '@/lib/validations/employee'
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
import { enforceMfaForPrivilegedUser } from '@/lib/security/mfa'

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
 * Wrapper for fire-and-forget alert detection with proper error logging
 * Use this instead of .catch(() => {}) to ensure errors are logged
 */
function runAlertDetectionBackground(employeeId: string): void {
  runAlertDetection(employeeId).catch((error) => {
    console.error('[AlertDetection] Unexpected error in background task:', error)
  })
}

/**
 * Revalidate all paths that display trip/employee data.
 * IMPORTANT: Always use this helper instead of individual revalidatePath calls
 * to ensure calendar, dashboard, and other views stay in sync.
 */
function revalidateTripData(employeeId?: string): void {
  revalidatePath('/dashboard')
  revalidatePath('/calendar')
  if (employeeId) {
    revalidatePath(`/employee/${employeeId}`)
  }
}

export async function addEmployeeAction(formData: { name: string; nationality_type?: string }) {
  const validated = employeeSchema.parse(formData)
  await createEmployee(validated)
  revalidateTripData()
}

export async function updateEmployeeAction(id: string, formData: { name: string; nationality_type?: string }) {
  const validated = employeeSchema.parse(formData)
  await updateEmployee(id, validated)
  revalidateTripData(id)
}

export async function deleteEmployeeAction(id: string) {
  await deleteEmployee(id)
  revalidateTripData(id)
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
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, created: 0, errors: [{ index: 0, message: 'Not authenticated' }] }
  }

  const rateLimit = await checkServerActionRateLimit(user.id, 'bulkAddTripsAction')
  if (!rateLimit.allowed) {
    return { success: false, created: 0, errors: [{ index: 0, message: rateLimit.error ?? 'Rate limit exceeded' }] }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') {
    const mfa = await enforceMfaForPrivilegedUser(supabase, user.id)
    if (!mfa.ok) {
      return { success: false, created: 0, errors: [{ index: 0, message: 'MFA required. Complete setup or verification to continue.' }] }
    }
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
  return getActiveAlerts()
}

/**
 * Get unacknowledged alerts (for dashboard banner)
 */
export async function getUnacknowledgedAlertsAction(): Promise<AlertWithEmployee[]> {
  return getUnacknowledgedAlerts()
}

/**
 * Acknowledge an alert (mark as read)
 */
export async function acknowledgeAlertAction(alertId: string): Promise<void> {
  await acknowledgeAlert(alertId)
  revalidatePath('/dashboard')
}

/**
 * Resolve an alert
 */
export async function resolveAlertAction(alertId: string): Promise<void> {
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
  return getCompanySettings()
}

/**
 * Update company notification settings
 */
export async function updateCompanySettingsAction(
  updates: CompanySettingsUpdate
): Promise<CompanySettings> {
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
  return getNotificationPreferences()
}

/**
 * Update user's notification preferences
 */
export async function updateNotificationPreferencesAction(
  updates: NotificationPreferencesUpdate
): Promise<NotificationPreferences> {
  const prefs = await updateNotificationPreferences(updates)
  revalidatePath('/settings')
  return prefs
}
