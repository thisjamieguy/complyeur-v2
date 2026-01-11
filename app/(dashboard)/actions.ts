'use server'

import { revalidatePath } from 'next/cache'
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
import type { TripInput, TripUpdate, CompanySettingsUpdate, NotificationPreferencesUpdate, AlertWithEmployee, CompanySettings, NotificationPreferences } from '@/types/database'

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

export async function addEmployeeAction(formData: { name: string }) {
  const validated = employeeSchema.parse(formData)
  await createEmployee(validated)
  revalidatePath('/dashboard')
}

export async function updateEmployeeAction(id: string, formData: { name: string }) {
  const validated = employeeSchema.parse(formData)
  await updateEmployee(id, validated)
  revalidatePath('/dashboard')
  revalidatePath(`/employee/${id}`)
}

export async function deleteEmployeeAction(id: string) {
  await deleteEmployee(id)
  revalidatePath('/dashboard')
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
  const tripData: TripInput = {
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
  runAlertDetection(validated.employee_id).catch(() => {})

  revalidatePath(`/employee/${validated.employee_id}`)
  revalidatePath('/dashboard')
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
  runAlertDetection(employeeId).catch(() => {})

  revalidatePath(`/employee/${employeeId}`)
  revalidatePath('/dashboard')
  return trip
}

export async function deleteTripAction(tripId: string, employeeId: string) {
  await deleteTrip(tripId)

  // Run alert detection after trip deletion (may resolve alerts)
  runAlertDetection(employeeId).catch(() => {})

  revalidatePath(`/employee/${employeeId}`)
  revalidatePath('/dashboard')
}

// Bulk trip creation
interface BulkTripInput {
  employee_id: string
  country: string
  entry_date: string
  exit_date: string
  purpose?: string
  job_ref?: string
  is_private?: boolean
  ghosted?: boolean
}

interface BulkTripResult {
  created: number
  errors?: { index: number; message: string }[]
}

export async function bulkAddTripsAction(
  trips: BulkTripInput[]
): Promise<BulkTripResult> {
  if (!trips || trips.length === 0) {
    throw new Error('No trips provided')
  }

  if (trips.length > 20) {
    throw new Error('Maximum 20 trips per batch')
  }

  // Get the employee_id from the first trip (all should be same employee)
  const employeeId = trips[0].employee_id

  const result = await createBulkTrips(trips)

  // Run alert detection after bulk trip creation (fire-and-forget)
  runAlertDetection(employeeId).catch(() => {})

  revalidatePath(`/employee/${employeeId}`)
  revalidatePath('/dashboard')

  return result
}

// Trip reassignment
export async function reassignTripAction(
  tripId: string,
  currentEmployeeId: string,
  newEmployeeId: string
): Promise<void> {
  await reassignTrip(tripId, newEmployeeId)

  // Run alert detection for both employees (trip removed from one, added to other)
  runAlertDetection(currentEmployeeId).catch(() => {})
  runAlertDetection(newEmployeeId).catch(() => {})

  revalidatePath(`/employee/${currentEmployeeId}`)
  revalidatePath(`/employee/${newEmployeeId}`)
  revalidatePath('/dashboard')
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
