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
} from '@/lib/db'
import { employeeSchema } from '@/lib/validations/employee'
import { tripSchema, tripUpdateSchema } from '@/lib/validations/trip'
import type { TripInsert, TripUpdate } from '@/types/database'

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
  const tripData: TripInsert = {
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
  revalidatePath(`/employee/${employeeId}`)
  revalidatePath('/dashboard')
  return trip
}

export async function deleteTripAction(tripId: string, employeeId: string) {
  await deleteTrip(tripId)
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
  revalidatePath(`/employee/${currentEmployeeId}`)
  revalidatePath(`/employee/${newEmployeeId}`)
  revalidatePath('/dashboard')
}
