import { createClient } from '@/lib/supabase/server'
import { AuthError, DatabaseError, NotFoundError, ValidationError } from '@/lib/errors'
import type { Trip, TripInput, TripInsert, TripUpdate } from '@/types/database'

interface AuthContext {
  userId: string
  companyId: string
}

/**
 * Verify user is authenticated and get their company_id
 * Throws if not authenticated or no company associated
 */
async function getAuthenticatedUserCompany(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<AuthContext> {
  // Explicit auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new AuthError('Unauthorized')
  }

  // Get user's company
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.company_id) {
    throw new DatabaseError('User has no associated company')
  }

  return { userId: user.id, companyId: profile.company_id }
}

/**
 * Get all trips for a specific employee
 */
export async function getTripsByEmployeeId(employeeId: string): Promise<Trip[]> {
  const supabase = await createClient()

  // Verify auth and get company
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  // Verify employee belongs to user's company
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id, company_id')
    .eq('id', employeeId)
    .single()

  if (employeeError || !employee || employee.company_id !== companyId) {
    // Return empty results for unauthorized access to match RLS behavior
    return []
  }

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('employee_id', employeeId)
    .order('entry_date', { ascending: false })

  if (error) {
    console.error('Error fetching trips:', error)
    throw new DatabaseError('Failed to fetch trips')
  }

  return data ?? []
}

/**
 * Get single trip by ID
 */
export async function getTripById(id: string): Promise<Trip | null> {
  const supabase = await createClient()

  // Verify auth and get company
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching trip:', error)
    throw new DatabaseError('Failed to fetch trip')
  }

  // Verify trip belongs to user's company
  if (data.company_id !== companyId) {
    // Return null for unauthorized access to match RLS behavior
    return null
  }

  return data
}

/**
 * Create a new trip
 *
 * Validates:
 * - Employee belongs to user's company
 * - No overlapping trips for the same employee
 */
export async function createTrip(trip: TripInput): Promise<Trip> {
  const supabase = await createClient()

  // Verify auth and get company
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  // Verify employee belongs to user's company
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id, company_id')
    .eq('id', trip.employee_id)
    .single()

  if (employeeError || !employee) {
    throw new NotFoundError('Employee not found')
  }

  if (employee.company_id !== companyId) {
    throw new NotFoundError('Employee not found')
  }

  // Check for overlapping trips
  const { data: existingTrips, error: tripsError } = await supabase
    .from('trips')
    .select('id, entry_date, exit_date')
    .eq('employee_id', trip.employee_id)

  if (tripsError) {
    console.error('Error checking for overlapping trips:', tripsError)
    throw new DatabaseError('Failed to validate trip dates')
  }

  const overlap = checkOverlap(trip.entry_date, trip.exit_date, existingTrips ?? [])
  if (overlap) {
    throw new ValidationError(overlap.message)
  }

  // Insert the trip with company_id
  const { data, error } = await supabase
    .from('trips')
    .insert({ ...trip, company_id: companyId })
    .select()
    .single()

  if (error) {
    console.error('Error creating trip:', error)
    if (error.code === '23514') {
      // Check constraint violation
      throw new ValidationError('Invalid trip data. Exit date must be on or after entry date.')
    }
    throw new DatabaseError('Failed to create trip')
  }

  return data
}

/**
 * Update an existing trip
 */
export async function updateTrip(id: string, updates: TripUpdate): Promise<Trip> {
  const supabase = await createClient()

  // Verify auth and get company
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  // Get the existing trip to validate ownership
  const { data: existingTrip, error: fetchError } = await supabase
    .from('trips')
    .select(`
      *,
      employee:employees!inner(company_id)
    `)
    .eq('id', id)
    .single()

  if (fetchError || !existingTrip) {
    throw new NotFoundError('Trip not found')
  }

  // Validate employee data structure at runtime
  const employee = existingTrip.employee
  if (!employee || typeof employee !== 'object' || !('company_id' in employee)) {
    throw new DatabaseError('Failed to validate trip ownership')
  }

  // Verify trip belongs to user's company
  const tripCompanyId = employee.company_id
  if (tripCompanyId !== companyId) {
    throw new NotFoundError('Trip not found')
  }

  // If dates are being updated, check for overlaps
  if (updates.entry_date || updates.exit_date) {
    const newEntryDate = updates.entry_date || existingTrip.entry_date
    const newExitDate = updates.exit_date || existingTrip.exit_date

    // Get other trips for this employee
    const { data: existingTrips, error: tripsError } = await supabase
      .from('trips')
      .select('id, entry_date, exit_date')
      .eq('employee_id', existingTrip.employee_id)
      .neq('id', id) // Exclude the trip being updated

    if (tripsError) {
      console.error('Error checking for overlapping trips:', tripsError)
      throw new DatabaseError('Failed to validate trip dates')
    }

    const overlap = checkOverlap(newEntryDate, newExitDate, existingTrips ?? [])
    if (overlap) {
      throw new ValidationError(overlap.message)
    }
  }

  const { data, error } = await supabase
    .from('trips')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating trip:', error)
    if (error.code === '23514') {
      throw new ValidationError('Invalid trip data. Exit date must be on or after entry date.')
    }
    throw new DatabaseError('Failed to update trip')
  }

  if (!data) {
    throw new NotFoundError('Trip not found')
  }

  return data
}

/**
 * Delete a trip
 */
export async function deleteTrip(id: string): Promise<void> {
  const supabase = await createClient()

  // Verify auth and get company
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  // Verify trip exists and belongs to user's company
  const { data: existingTrip, error: fetchError } = await supabase
    .from('trips')
    .select('id, company_id')
    .eq('id', id)
    .single()

  if (fetchError || !existingTrip) {
    throw new NotFoundError('Trip not found')
  }

  if (existingTrip.company_id !== companyId) {
    throw new NotFoundError('Trip not found')
  }

  // Now safe to delete
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting trip:', error)
    throw new DatabaseError('Failed to delete trip')
  }
}

/**
 * Get trip count for an employee
 */
export async function getTripCountByEmployeeId(employeeId: string): Promise<number> {
  const supabase = await createClient()

  // Verify auth and get company
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  // Verify employee belongs to user's company
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id, company_id')
    .eq('id', employeeId)
    .single()

  if (employeeError || !employee || employee.company_id !== companyId) {
    // Return 0 for unauthorized access to match RLS behavior
    return 0
  }

  const { count, error } = await supabase
    .from('trips')
    .select('*', { count: 'exact', head: true })
    .eq('employee_id', employeeId)

  if (error) {
    console.error('Error counting trips:', error)
    throw new DatabaseError('Failed to count trips')
  }

  return count ?? 0
}

// Helper function to check for trip overlaps
interface TripDateRange {
  id: string
  entry_date: string
  exit_date: string
}

function checkOverlap(
  newEntryDate: string,
  newExitDate: string,
  existingTrips: TripDateRange[]
): { hasOverlap: true; message: string } | null {
  const newEntry = new Date(newEntryDate)
  const newExit = new Date(newExitDate)

  for (const trip of existingTrips) {
    const tripStart = new Date(trip.entry_date)
    const tripEnd = new Date(trip.exit_date)

    // Overlap exists if: newEntry <= tripEnd AND newExit >= tripStart
    if (newEntry <= tripEnd && newExit >= tripStart) {
      const start = formatDate(trip.entry_date)
      const end = formatDate(trip.exit_date)
      return {
        hasOverlap: true,
        message: `Trip overlaps with existing trip (${start} - ${end}). Please adjust dates.`,
      }
    }
  }

  return null
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Create multiple trips at once
 * Validates each trip individually and returns errors per trip
 */
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

export async function createBulkTrips(trips: BulkTripInput[]): Promise<BulkTripResult> {
  const supabase = await createClient()

  // Verify auth and get company
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  // Get the employee_id (all trips should be for the same employee)
  const employeeId = trips[0]?.employee_id
  if (!employeeId) {
    throw new ValidationError('No employee specified')
  }

  // Verify employee belongs to user's company
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id, company_id')
    .eq('id', employeeId)
    .single()

  if (employeeError || !employee || employee.company_id !== companyId) {
    throw new NotFoundError('Employee not found')
  }

  // Get existing trips for overlap checking
  const { data: existingTrips, error: tripsError } = await supabase
    .from('trips')
    .select('id, entry_date, exit_date')
    .eq('employee_id', employeeId)

  if (tripsError) {
    console.error('Error fetching existing trips:', tripsError)
    throw new DatabaseError('Failed to validate trip dates')
  }

  const errors: { index: number; message: string }[] = []
  const validTrips: TripInput[] = []

  // Include newly validated trips in overlap checking
  const allTripsForOverlapCheck = [...(existingTrips ?? [])]

  for (let i = 0; i < trips.length; i++) {
    const trip = trips[i]

    // Validate employee_id matches
    if (trip.employee_id !== employeeId) {
      errors.push({ index: i, message: 'All trips must be for the same employee' })
      continue
    }

    // Validate dates
    const entryDate = new Date(trip.entry_date)
    const exitDate = new Date(trip.exit_date)

    if (isNaN(entryDate.getTime()) || isNaN(exitDate.getTime())) {
      errors.push({ index: i, message: 'Invalid date format' })
      continue
    }

    if (exitDate < entryDate) {
      errors.push({ index: i, message: 'Exit date must be after entry date' })
      continue
    }

    // Check for overlaps with existing trips and previously validated trips in this batch
    const overlap = checkOverlap(trip.entry_date, trip.exit_date, allTripsForOverlapCheck)
    if (overlap) {
      errors.push({ index: i, message: 'Trip overlaps with existing trip' })
      continue
    }

    // Add this trip to overlap checking for subsequent trips in batch
    allTripsForOverlapCheck.push({
      id: `pending-${i}`,
      entry_date: trip.entry_date,
      exit_date: trip.exit_date,
    })

    validTrips.push({
      employee_id: trip.employee_id,
      country: trip.country.toUpperCase(),
      entry_date: trip.entry_date,
      exit_date: trip.exit_date,
      purpose: trip.purpose,
      job_ref: trip.job_ref,
      is_private: trip.is_private,
      ghosted: trip.ghosted,
    })
  }

  // If no valid trips, return errors
  if (validTrips.length === 0) {
    return { created: 0, errors }
  }

  // Insert valid trips with company_id
  const { data: created, error: insertError } = await supabase
    .from('trips')
    .insert(validTrips.map(trip => ({ ...trip, company_id: companyId })))
    .select()

  if (insertError) {
    console.error('Bulk insert error:', insertError)
    throw new DatabaseError('Failed to create trips')
  }

  return {
    created: created?.length ?? 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Reassign a trip from one employee to another
 */
export async function reassignTrip(tripId: string, newEmployeeId: string): Promise<Trip> {
  const supabase = await createClient()

  // Verify auth and get company
  const { companyId } = await getAuthenticatedUserCompany(supabase)

  // Get the existing trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single()

  if (tripError || !trip) {
    throw new NotFoundError('Trip not found')
  }

  if (trip.company_id !== companyId) {
    throw new NotFoundError('Trip not found')
  }

  // Verify new employee belongs to same company
  const { data: newEmployee, error: employeeError } = await supabase
    .from('employees')
    .select('id, company_id')
    .eq('id', newEmployeeId)
    .single()

  if (employeeError || !newEmployee) {
    throw new NotFoundError('Employee not found')
  }

  if (newEmployee.company_id !== companyId) {
    throw new NotFoundError('Employee not found')
  }

  // Check for overlapping trips with new employee
  const { data: existingTrips, error: tripsError } = await supabase
    .from('trips')
    .select('id, entry_date, exit_date')
    .eq('employee_id', newEmployeeId)
    .neq('id', tripId) // Exclude the trip being moved

  if (tripsError) {
    console.error('Error checking for overlapping trips:', tripsError)
    throw new DatabaseError('Failed to validate trip dates')
  }

  const overlap = checkOverlap(trip.entry_date, trip.exit_date, existingTrips ?? [])
  if (overlap) {
    throw new ValidationError('Trip would overlap with existing trips for this employee')
  }

  // Update the trip
  const { data: updated, error: updateError } = await supabase
    .from('trips')
    .update({ employee_id: newEmployeeId, updated_at: new Date().toISOString() })
    .eq('id', tripId)
    .select()
    .single()

  if (updateError) {
    console.error('Error reassigning trip:', updateError)
    throw new DatabaseError('Failed to reassign trip')
  }

  return updated
}
