'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logGdprAction } from '@/lib/gdpr/audit'
import { requireCompanyAccess } from '@/lib/security/tenant-access'
import { isOwnerOrAdmin } from '@/lib/permissions'

/**
 * Max IDs per Supabase PostgREST `.in()` call to stay under URL length limits.
 * Each UUID is ~36 chars; 100 UUIDs ≈ 3.6 KB which is safely under the ~8 KB limit.
 */
const BATCH_SIZE = 100

/**
 * Parameters for bulk data deletion
 */
export interface BulkDeleteParams {
  employeeIds: string[]
  tripIds: string[]
  mappingIds: string[]
  historyIds: string[]
}

/**
 * Result of bulk deletion operation
 */
export interface BulkDeleteResult {
  success: boolean
  employees: number
  trips: number
  mappings: number
  history: number
  errors: string[]
}

/**
 * Counts for each data type the user can delete
 */
export interface DataCounts {
  employees: number
  trips: number
  mappings: number
  history: number
}

/**
 * Employee item for selection UI
 */
export interface EmployeeItem {
  id: string
  name: string
}

/**
 * Trip item for selection UI
 */
export interface TripItem {
  id: string
  employeeName: string
  destination: string
  startDate: string
  endDate: string
}

/**
 * Mapping item for selection UI
 */
export interface MappingItem {
  id: string
  name: string
}

/**
 * History item for selection UI
 */
export interface HistoryItem {
  id: string
  fileName: string
  createdAt: string
}

/**
 * Gets counts of all deletable data for the current company
 */
export async function getDataCounts(): Promise<DataCounts> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .single()

  if (!profile?.company_id || !isOwnerOrAdmin(profile.role)) {
    return { employees: 0, trips: 0, mappings: 0, history: 0 }
  }

  // Run all count queries in parallel
  const [employeesResult, tripsResult, mappingsResult, historyResult] = await Promise.all([
    supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .is('deleted_at', null),
    supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id),
    supabase
      .from('column_mappings')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id),
    supabase
      .from('import_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .in('status', ['completed', 'failed']),
  ])

  return {
    employees: employeesResult.count ?? 0,
    trips: tripsResult.count ?? 0,
    mappings: mappingsResult.count ?? 0,
    history: historyResult.count ?? 0,
  }
}

/**
 * Gets list of employees for selection UI
 */
export async function getEmployeesForDeletion(): Promise<EmployeeItem[]> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .single()

  if (!profile?.company_id || !isOwnerOrAdmin(profile.role)) {
    return []
  }

  const { data, error } = await supabase
    .from('employees')
    .select('id, name')
    .eq('company_id', profile.company_id)
    .is('deleted_at', null)
    .order('name')

  if (error) {
    console.error('[BulkDelete] Failed to fetch employees:', error)
    return []
  }

  return data ?? []
}

/**
 * Gets list of trips for selection UI
 */
export async function getTripsForDeletion(): Promise<TripItem[]> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .single()

  if (!profile?.company_id || !isOwnerOrAdmin(profile.role)) {
    return []
  }

  const { data, error } = await supabase
    .from('trips')
    .select('id, country, entry_date, exit_date, employee:employees(name)')
    .eq('company_id', profile.company_id)
    .order('entry_date', { ascending: false })
    .limit(500) // Reasonable limit for UI

  if (error) {
    console.error('[BulkDelete] Failed to fetch trips:', error)
    return []
  }

  return (data ?? []).map((trip) => ({
    id: trip.id,
    employeeName: (trip.employee as { name: string } | null)?.name ?? 'Unknown',
    destination: trip.country,
    startDate: trip.entry_date,
    endDate: trip.exit_date,
  }))
}

/**
 * Gets list of column mappings for selection UI
 */
export async function getMappingsForDeletion(): Promise<MappingItem[]> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .single()

  if (!profile?.company_id || !isOwnerOrAdmin(profile.role)) {
    return []
  }

  const { data, error } = await supabase
    .from('column_mappings')
    .select('id, name')
    .eq('company_id', profile.company_id)
    .order('name')

  if (error) {
    console.error('[BulkDelete] Failed to fetch mappings:', error)
    return []
  }

  return data ?? []
}

/**
 * Gets list of import history for selection UI
 */
export async function getHistoryForDeletion(): Promise<HistoryItem[]> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .single()

  if (!profile?.company_id || !isOwnerOrAdmin(profile.role)) {
    return []
  }

  const { data, error } = await supabase
    .from('import_sessions')
    .select('id, file_name, created_at')
    .eq('company_id', profile.company_id)
    .in('status', ['completed', 'failed'])
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[BulkDelete] Failed to fetch history:', error)
    return []
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    fileName: item.file_name,
    createdAt: item.created_at ?? '',
  }))
}

/**
 * Bulk deletes selected data.
 *
 * - Employees: Soft-deleted (30-day recovery via GDPR page)
 * - Trips: Hard-deleted (permanent)
 * - Mappings: Hard-deleted (permanent)
 * - History: Hard-deleted (permanent)
 *
 * Execution order: trips → employees → mappings → history
 * (trips first due to foreign key constraints)
 *
 * Uses admin client (service role) for the actual database operations because:
 * 1. Large ID lists exceed PostgREST URL limits — batching is needed
 * 2. Employee soft-delete (setting deleted_at) can trigger RLS violations
 *    when the updated row becomes invisible to the user's SELECT policies
 * Authentication and authorization are verified first with the regular client.
 */
export async function bulkDeleteData(params: BulkDeleteParams): Promise<BulkDeleteResult> {
  const supabase = await createClient()
  const errors: string[] = []
  let employeesDeleted = 0
  let tripsDeleted = 0
  let mappingsDeleted = 0
  let historyDeleted = 0

  try {
    // Verify authentication and owner/admin role using the regular (RLS-enforced) client
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return {
        success: false,
        employees: 0,
        trips: 0,
        mappings: 0,
        history: 0,
        errors: ['Not authenticated'],
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id || !isOwnerOrAdmin(profile.role)) {
      return {
        success: false,
        employees: 0,
        trips: 0,
        mappings: 0,
        history: 0,
        errors: ['Owner or admin access required'],
      }
    }

    await requireCompanyAccess(supabase, profile.company_id)

    // Use admin client for actual operations (bypasses RLS after auth verification above)
    const admin = createAdminClient()

    // 1. Hard-delete trips in batches
    if (params.tripIds.length > 0) {
      try {
        for (let i = 0; i < params.tripIds.length; i += BATCH_SIZE) {
          const batch = params.tripIds.slice(i, i + BATCH_SIZE)
          const { error: tripError, count } = await admin
            .from('trips')
            .delete({ count: 'exact' })
            .eq('company_id', profile.company_id)
            .in('id', batch)

          if (tripError) {
            throw tripError
          }
          tripsDeleted += count ?? batch.length
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('[BulkDelete] Trip deletion failed:', err)
        errors.push(`Failed to delete trips: ${msg}`)
      }
    }

    // 2. Soft-delete employees in batches (update deleted_at)
    if (params.employeeIds.length > 0) {
      const now = new Date().toISOString()

      try {
        for (let i = 0; i < params.employeeIds.length; i += BATCH_SIZE) {
          const batch = params.employeeIds.slice(i, i + BATCH_SIZE)
          const { error: empError, count } = await admin
            .from('employees')
            .update({ deleted_at: now } as Record<string, unknown>)
            .eq('company_id', profile.company_id)
            .in('id', batch)
            .is('deleted_at', null)

          if (empError) {
            throw empError
          }
          employeesDeleted += count ?? batch.length
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('[BulkDelete] Employee deletion failed:', err)
        errors.push(`Failed to delete employees: ${msg}`)
      }
    }

    // 3. Hard-delete column mappings in batches
    if (params.mappingIds.length > 0) {
      try {
        for (let i = 0; i < params.mappingIds.length; i += BATCH_SIZE) {
          const batch = params.mappingIds.slice(i, i + BATCH_SIZE)
          const { error: mapError, count } = await admin
            .from('column_mappings')
            .delete({ count: 'exact' })
            .eq('company_id', profile.company_id)
            .in('id', batch)

          if (mapError) {
            throw mapError
          }
          mappingsDeleted += count ?? batch.length
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('[BulkDelete] Mapping deletion failed:', err)
        errors.push(`Failed to delete mappings: ${msg}`)
      }
    }

    // 4. Hard-delete import history in batches
    if (params.historyIds.length > 0) {
      try {
        for (let i = 0; i < params.historyIds.length; i += BATCH_SIZE) {
          const batch = params.historyIds.slice(i, i + BATCH_SIZE)
          const { error: histError, count } = await admin
            .from('import_sessions')
            .delete({ count: 'exact' })
            .eq('company_id', profile.company_id)
            .in('id', batch)

          if (histError) {
            throw histError
          }
          historyDeleted += count ?? batch.length
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('[BulkDelete] History deletion failed:', err)
        errors.push(`Failed to delete import history: ${msg}`)
      }
    }

    // 5. Log to GDPR audit trail
    await logGdprAction({
      companyId: profile.company_id,
      userId: user.id,
      action: 'BULK_DELETE',
      entityType: 'bulk_data',
      entityId: null,
      details: {
        employees_soft_deleted: employeesDeleted,
        trips_hard_deleted: tripsDeleted,
        mappings_hard_deleted: mappingsDeleted,
        history_hard_deleted: historyDeleted,
        errors: errors.length > 0 ? errors : undefined,
      },
    })

    // Revalidate relevant paths
    revalidatePath('/dashboard')
    revalidatePath('/calendar')
    revalidatePath('/settings')
    revalidatePath('/settings/mappings')
    revalidatePath('/settings/import-history')
    revalidatePath('/gdpr')

    const success = errors.length === 0

    return {
      success,
      employees: employeesDeleted,
      trips: tripsDeleted,
      mappings: mappingsDeleted,
      history: historyDeleted,
      errors,
    }
  } catch (error) {
    console.error('[BulkDelete] Unexpected error:', error)
    return {
      success: false,
      employees: employeesDeleted,
      trips: tripsDeleted,
      mappings: mappingsDeleted,
      history: historyDeleted,
      errors: [...errors, error instanceof Error ? error.message : 'Unexpected error'],
    }
  }
}
