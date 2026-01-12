import { createClient } from '@/lib/supabase/server'
import { DatabaseError, NotFoundError } from '@/lib/errors'
import type { Employee, EmployeeCreateInput, EmployeeUpdate } from '@/types/database-helpers'

/**
 * Get all employees for current user's company
 */
export async function getEmployees(): Promise<Employee[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('employees')
    .select('*')
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

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
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

  // Get current user's company_id from their profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .single()

  if (profileError) {
    console.error('Error fetching user profile:', profileError)
    throw new DatabaseError('Failed to get user profile')
  }

  if (!profile?.company_id) {
    throw new DatabaseError('User has no associated company')
  }

  const { data, error } = await supabase
    .from('employees')
    .insert({ ...employee, company_id: profile.company_id })
    .select()
    .single()

  if (error) {
    console.error('Error creating employee:', error)
    throw new DatabaseError('Failed to create employee')
  }

  return data
}

/**
 * Update employee
 */
export async function updateEmployee(id: string, updates: EmployeeUpdate): Promise<Employee> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

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

  const { count, error } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('Error counting employees:', error)
    throw new DatabaseError('Failed to count employees')
  }

  return count ?? 0
}
