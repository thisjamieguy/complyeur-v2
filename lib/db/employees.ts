import { createClient } from '@/lib/supabase/server'
import { DatabaseError, NotFoundError } from '@/lib/errors'
import { requireCompanyAccess } from '@/lib/security/tenant-access'
import type { Employee, EmployeeCreateInput, EmployeeUpdate } from '@/types/database-helpers'

interface SupabaseQueryErrorLike {
  code?: string | null
  message?: string | null
}

function isMissingNationalityTypeColumnError(
  error: SupabaseQueryErrorLike | null | undefined
): boolean {
  if (!error) return false
  if (error.code === '42703') return true
  const message = (error.message ?? '').toLowerCase()
  return message.includes('nationality_type') && message.includes('does not exist')
}

function omitNationalityType<T extends Record<string, unknown>>(input: T): Omit<T, 'nationality_type'> {
  const copy = { ...input }
  delete (copy as { nationality_type?: unknown }).nationality_type
  return copy as Omit<T, 'nationality_type'>
}

/**
 * Get all employees for current user's company
 */
export async function getEmployees(): Promise<Employee[]> {
  const supabase = await createClient()
  const { companyId } = await requireCompanyAccess(supabase)

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('company_id', companyId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching employees:', error)
    throw new DatabaseError('Failed to fetch employees')
  }

  return data ?? []
}

/**
 * Get single employee by ID
 */
export async function getEmployeeById(id: string): Promise<Employee | null> {
  const supabase = await createClient()
  const { companyId } = await requireCompanyAccess(supabase)

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .eq('company_id', companyId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching employee:', error)
    throw new DatabaseError('Failed to fetch employee')
  }

  return data
}

/**
 * Create new employee
 */
export async function createEmployee(employee: EmployeeCreateInput): Promise<Employee> {
  const supabase = await createClient()

  const { companyId } = await requireCompanyAccess(supabase)

  const payload = { ...employee, company_id: companyId }

  let { data, error } = await supabase
    .from('employees')
    .insert(payload)
    .select()
    .single()

  if (error && isMissingNationalityTypeColumnError(error)) {
    console.warn(
      '[Employees] employees.nationality_type is missing; retrying create without nationality_type'
    )
    const fallback = await supabase
      .from('employees')
      .insert(omitNationalityType(payload))
      .select()
      .single()

    data = fallback.data
    error = fallback.error
  }

  if (error) {
    console.error('Error creating employee:', error)
    throw new DatabaseError('Failed to create employee')
  }

  if (!data) {
    throw new DatabaseError('Failed to create employee')
  }

  return data
}

/**
 * Update employee
 */
export async function updateEmployee(id: string, updates: EmployeeUpdate): Promise<Employee> {
  const supabase = await createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('employees')
    .select('company_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    throw new NotFoundError('Employee not found')
  }

  await requireCompanyAccess(supabase, existing.company_id)

  let { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error && isMissingNationalityTypeColumnError(error)) {
    console.warn(
      '[Employees] employees.nationality_type is missing; retrying update without nationality_type'
    )
    const legacyUpdates = omitNationalityType(updates as Record<string, unknown>)

    if (Object.keys(legacyUpdates).length === 0) {
      const currentEmployee = await getEmployeeById(id)
      if (!currentEmployee) {
        throw new NotFoundError('Employee not found')
      }
      return currentEmployee
    }

    const fallback = await supabase
      .from('employees')
      .update(legacyUpdates)
      .eq('id', id)
      .select()
      .single()

    data = fallback.data
    error = fallback.error
  }

  if (error) {
    console.error('Error updating employee:', error)
    throw new DatabaseError('Failed to update employee')
  }

  if (!data) {
    throw new NotFoundError('Employee not found')
  }

  return data
}

/**
 * Delete employee (cascades to trips via FK)
 */
export async function deleteEmployee(id: string): Promise<void> {
  const supabase = await createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('employees')
    .select('company_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    throw new NotFoundError('Employee not found')
  }

  await requireCompanyAccess(supabase, existing.company_id)

  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting employee:', error)
    throw new DatabaseError('Failed to delete employee')
  }
}

/**
 * Count employees for current company
 */
export async function getEmployeeCount(): Promise<number> {
  const supabase = await createClient()
  const { companyId } = await requireCompanyAccess(supabase)

  const { count, error } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)

  if (error) {
    console.error('Error counting employees:', error)
    throw new DatabaseError('Failed to count employees')
  }

  return count ?? 0
}
