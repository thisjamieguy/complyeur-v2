'use server'

import { createClient } from '@/lib/supabase/server'
import { formatDateForDisplay } from './dates'

/**
 * Server-side trip overlap detection
 *
 * Queries Supabase to check if a new/edited trip would overlap
 * with existing trips for the same employee.
 *
 * SECURITY: All queries filter by company_id from authenticated session
 * to enforce multi-tenant isolation (defense-in-depth with RLS).
 */

export interface TripOverlapResult {
  hasOverlap: boolean
  conflictingTrip?: {
    id: string
    entry_date: string
    exit_date: string
    country: string
  }
  message?: string
}

/**
 * Get authenticated user's company_id from session
 * @throws Error if not authenticated or no company associated
 */
async function getAuthenticatedCompanyId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.company_id) {
    throw new Error('User has no associated company')
  }

  return profile.company_id
}

/**
 * Check if a trip would overlap with existing trips for an employee
 *
 * This is a server action that can be called from the client
 * to validate before submitting the form.
 *
 * @param employeeId - The employee's ID
 * @param startDate - Start date of the new/edited trip (YYYY-MM-DD)
 * @param endDate - End date of the new/edited trip (YYYY-MM-DD)
 * @param excludeTripId - Trip ID to exclude (for edit operations)
 */
export async function checkTripOverlap(
  employeeId: string,
  startDate: string,
  endDate: string,
  excludeTripId?: string
): Promise<TripOverlapResult> {
  const supabase = await createClient()

  // Get company_id from authenticated session (defense-in-depth)
  let companyId: string
  try {
    companyId = await getAuthenticatedCompanyId(supabase)
  } catch {
    // Return no overlap if not authenticated - let the server action handle auth errors
    return { hasOverlap: false }
  }

  // Query for overlapping trips - MUST filter by both employee_id AND company_id
  // Overlap exists when: new.start <= existing.end AND new.end >= existing.start
  let query = supabase
    .from('trips')
    .select('id, entry_date, exit_date, country')
    .eq('employee_id', employeeId)
    .eq('company_id', companyId) // Multi-tenant security: filter by company
    .lte('entry_date', endDate) // existing starts before or on new end
    .gte('exit_date', startDate) // existing ends on or after new start

  // Exclude the trip being edited
  if (excludeTripId) {
    query = query.neq('id', excludeTripId)
  }

  const { data: overlappingTrips, error } = await query

  if (error) {
    console.error('[TripOverlap] Error checking overlap:', error)
    // Return no overlap on error to not block the user
    // The server action will do its own validation
    return { hasOverlap: false }
  }

  if (overlappingTrips && overlappingTrips.length > 0) {
    const conflict = overlappingTrips[0]
    const startFormatted = formatDateForDisplay(conflict.entry_date)
    const endFormatted = formatDateForDisplay(conflict.exit_date)

    return {
      hasOverlap: true,
      conflictingTrip: conflict,
      message: `This trip overlaps with an existing trip (${startFormatted} - ${endFormatted}). Please adjust the dates.`,
    }
  }

  return { hasOverlap: false }
}

/**
 * Check for overlapping trips for multiple date ranges (batch validation)
 * Useful for bulk trip creation
 */
export async function checkBulkTripOverlaps(
  employeeId: string,
  trips: Array<{ startDate: string; endDate: string; index: number }>
): Promise<Array<{ index: number; hasOverlap: boolean; message?: string }>> {
  const results: Array<{ index: number; hasOverlap: boolean; message?: string }> = []

  const supabase = await createClient()

  // Get company_id from authenticated session (defense-in-depth)
  let companyId: string
  try {
    companyId = await getAuthenticatedCompanyId(supabase)
  } catch {
    // Return all as no overlap if not authenticated
    return trips.map((t) => ({ index: t.index, hasOverlap: false }))
  }

  // Get all existing trips for the employee - MUST filter by company_id
  const { data: existingTrips, error } = await supabase
    .from('trips')
    .select('id, entry_date, exit_date')
    .eq('employee_id', employeeId)
    .eq('company_id', companyId) // Multi-tenant security: filter by company

  if (error) {
    console.error('[TripOverlap] Error fetching existing trips:', error)
    // Return all as no overlap on error
    return trips.map((t) => ({ index: t.index, hasOverlap: false }))
  }

  const allTrips = [...(existingTrips || [])]

  for (const trip of trips) {
    const overlap = findOverlap(trip.startDate, trip.endDate, allTrips)

    if (overlap) {
      results.push({
        index: trip.index,
        hasOverlap: true,
        message: `Trip ${trip.index + 1} overlaps with existing trip`,
      })
    } else {
      results.push({
        index: trip.index,
        hasOverlap: false,
      })

      // Add this trip to allTrips for checking subsequent trips in batch
      allTrips.push({
        id: `pending-${trip.index}`,
        entry_date: trip.startDate,
        exit_date: trip.endDate,
      })
    }
  }

  return results
}

// Helper to check if dates overlap with any trips in a list
function findOverlap(
  startDate: string,
  endDate: string,
  trips: Array<{ id: string; entry_date: string; exit_date: string }>
): { id: string; entry_date: string; exit_date: string } | null {
  const newStart = new Date(startDate)
  const newEnd = new Date(endDate)

  for (const trip of trips) {
    const tripStart = new Date(trip.entry_date)
    const tripEnd = new Date(trip.exit_date)

    // Overlap exists if: newStart <= tripEnd AND newEnd >= tripStart
    if (newStart <= tripEnd && newEnd >= tripStart) {
      return trip
    }
  }

  return null
}
