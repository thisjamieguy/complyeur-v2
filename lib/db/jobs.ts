import { createClient } from '@/lib/supabase/server'
import { DatabaseError, NotFoundError } from '@/lib/errors'
import { requireCompanyAccess } from '@/lib/security/tenant-access'
import type {
  Job,
  JobInput,
  JobUpdate,
  JobWithTrips,
  Trip,
  TripUpdate,
} from '@/types/database-helpers'
import type { JobCreateData, JobTripUpdateData, JobUpdateData } from '@/lib/validations/job'

interface AuthContext {
  companyId: string
  userId: string
}

export interface JobTripError {
  employeeId: string
  message: string
}

export interface JobListItem extends Job {
  trip_count: number
}

type EmployeeLookup = Map<string, { id: string; name: string; company_id: string }>

async function getAuthenticatedContext(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<AuthContext> {
  return requireCompanyAccess(supabase)
}

function checkOverlap(
  newEntryDate: string,
  newExitDate: string,
  existingTrips: Array<Pick<Trip, 'id' | 'entry_date' | 'exit_date'>>
): string | null {
  const overlap = existingTrips.find(
    (trip) => newEntryDate <= trip.exit_date && newExitDate >= trip.entry_date
  )

  if (!overlap) {
    return null
  }

  return `Trip overlaps with existing trip (${overlap.entry_date} - ${overlap.exit_date}).`
}

async function getEmployeesByIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  employeeIds: string[]
): Promise<EmployeeLookup> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, company_id')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .in('id', employeeIds)

  if (error) {
    console.error('[Jobs] Failed to fetch employees:', error)
    throw new DatabaseError('Failed to validate employees')
  }

  return new Map((data ?? []).map((employee) => [employee.id, employee]))
}

async function validateJobTripOverlaps(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  trips: Array<{
    employee_id: string
    entry_date: string
    exit_date: string
    excludeTripId?: string
    excludeJobId?: string
  }>
): Promise<JobTripError[]> {
  const employeeIds = Array.from(new Set(trips.map((trip) => trip.employee_id)))
  if (employeeIds.length === 0) return []

  const { data, error } = await supabase
    .from('trips')
    .select('id, employee_id, entry_date, exit_date, job_id')
    .eq('company_id', companyId)
    .in('employee_id', employeeIds)

  if (error) {
    console.error('[Jobs] Failed to fetch trips for overlap validation:', error)
    throw new DatabaseError('Failed to validate trip dates')
  }

  const errors: JobTripError[] = []

  for (const trip of trips) {
    const existingTrips = (data ?? []).filter((existingTrip) => {
      if (existingTrip.employee_id !== trip.employee_id) return false
      if (trip.excludeTripId && existingTrip.id === trip.excludeTripId) return false
      if (trip.excludeJobId && existingTrip.job_id === trip.excludeJobId) return false
      return true
    })

    const overlapMessage = checkOverlap(
      trip.entry_date,
      trip.exit_date,
      existingTrips
    )

    if (overlapMessage) {
      errors.push({
        employeeId: trip.employee_id,
        message: overlapMessage,
      })
    }
  }

  return errors
}

async function deleteJobBestEffort(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
  companyId: string
): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId)
    .eq('company_id', companyId)

  if (error) {
    console.error('[Jobs] Failed to roll back job after trip insert failure:', error)
  }
}

export async function getJobs(): Promise<JobListItem[]> {
  const supabase = await createClient()
  const { companyId } = await getAuthenticatedContext(supabase)

  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('*')
    .eq('company_id', companyId)
    .order('entry_date', { ascending: false })
    .limit(500)

  if (jobsError) {
    console.error('[Jobs] Failed to fetch jobs:', jobsError)
    throw new DatabaseError('Failed to fetch jobs')
  }

  if (!jobs || jobs.length === 0) {
    return []
  }

  const jobIds = jobs.map((job) => job.id)
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('id, job_id')
    .eq('company_id', companyId)
    .in('job_id', jobIds)

  if (tripsError) {
    console.error('[Jobs] Failed to fetch job trip counts:', tripsError)
    throw new DatabaseError('Failed to fetch job trip counts')
  }

  const counts = new Map<string, number>()
  for (const trip of trips ?? []) {
    if (!trip.job_id) continue
    counts.set(trip.job_id, (counts.get(trip.job_id) ?? 0) + 1)
  }

  return jobs.map((job) => ({
    ...job,
    trip_count: counts.get(job.id) ?? 0,
  }))
}

export async function getJobById(jobId: string): Promise<JobWithTrips | null> {
  const supabase = await createClient()
  const { companyId } = await getAuthenticatedContext(supabase)

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .eq('company_id', companyId)
    .single()

  if (jobError) {
    if (jobError.code === 'PGRST116') return null
    console.error('[Jobs] Failed to fetch job:', jobError)
    throw new DatabaseError('Failed to fetch job')
  }

  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('*, employee:employees!trips_employee_id_fkey(id, name)')
    .eq('job_id', jobId)
    .eq('company_id', companyId)
    .order('entry_date', { ascending: true })

  if (tripsError) {
    console.error('[Jobs] Failed to fetch job trips:', tripsError)
    throw new DatabaseError('Failed to fetch job trips')
  }

  return {
    ...job,
    trips: (trips ?? []) as JobWithTrips['trips'],
  }
}

export async function createJobWithTrips(
  input: JobCreateData
): Promise<{ job?: Job; errors?: JobTripError[] }> {
  const supabase = await createClient()
  const { companyId } = await getAuthenticatedContext(supabase)

  const employeeIds = input.employees.map((employee) => employee.employee_id)
  const employees = await getEmployeesByIds(supabase, companyId, employeeIds)
  const missingEmployees = employeeIds.filter((employeeId) => !employees.has(employeeId))

  if (missingEmployees.length > 0) {
    return {
      errors: missingEmployees.map((employeeId) => ({
        employeeId,
        message: 'Employee not found',
      })),
    }
  }

  const overlapErrors = await validateJobTripOverlaps(
    supabase,
    companyId,
    input.employees
  )

  if (overlapErrors.length > 0) {
    return { errors: overlapErrors }
  }

  const jobInput: JobInput = {
    company_id: companyId,
    job_ref: input.job_ref,
    customer: input.customer,
    country: input.country,
    entry_date: input.entry_date,
    exit_date: input.exit_date,
    purpose: input.purpose,
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert(jobInput)
    .select()
    .single()

  if (jobError || !job) {
    console.error('[Jobs] Failed to create job:', jobError)
    throw new DatabaseError('Failed to create job')
  }

  const trips = input.employees.map((employee) => ({
    employee_id: employee.employee_id,
    company_id: companyId,
    job_id: job.id,
    country: employee.country,
    entry_date: employee.entry_date,
    exit_date: employee.exit_date,
    purpose: input.purpose,
    job_ref: input.job_ref,
    is_private: false,
    ghosted: false,
  }))

  const { error: tripError } = await supabase.from('trips').insert(trips)

  if (tripError) {
    console.error('[Jobs] Failed to create linked trips:', tripError)
    await deleteJobBestEffort(supabase, job.id, companyId)
    throw new DatabaseError('Failed to create job trips')
  }

  return { job }
}

export async function updateJobWithTrips(
  jobId: string,
  input: JobUpdateData
): Promise<{ job: Job; errors?: JobTripError[] }> {
  const supabase = await createClient()
  const { companyId } = await getAuthenticatedContext(supabase)

  const existing = await getJobById(jobId)
  if (!existing) {
    throw new NotFoundError('Job not found')
  }

  if (input.applyToTrips && existing.trips.length > 0) {
    const overlapErrors = await validateJobTripOverlaps(
      supabase,
      companyId,
      existing.trips.map((trip) => ({
        employee_id: trip.employee_id,
        entry_date: input.entry_date,
        exit_date: input.exit_date,
        excludeTripId: trip.id,
        excludeJobId: jobId,
      }))
    )

    if (overlapErrors.length > 0) {
      return { job: existing, errors: overlapErrors }
    }
  }

  const updateData: JobUpdate = {
    job_ref: input.job_ref,
    customer: input.customer,
    country: input.country,
    entry_date: input.entry_date,
    exit_date: input.exit_date,
    purpose: input.purpose,
    updated_at: new Date().toISOString(),
  }

  const { data: job, error } = await supabase
    .from('jobs')
    .update(updateData)
    .eq('id', jobId)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error || !job) {
    console.error('[Jobs] Failed to update job:', error)
    throw new DatabaseError('Failed to update job')
  }

  const tripUpdates: TripUpdate = input.applyToTrips
    ? {
        job_ref: input.job_ref,
        purpose: input.purpose,
        country: input.country,
        entry_date: input.entry_date,
        exit_date: input.exit_date,
        updated_at: new Date().toISOString(),
      }
    : {
        job_ref: input.job_ref,
        purpose: input.purpose,
        updated_at: new Date().toISOString(),
      }

  const { error: tripError } = await supabase
    .from('trips')
    .update(tripUpdates)
    .eq('job_id', jobId)
    .eq('company_id', companyId)

  if (tripError) {
    console.error('[Jobs] Failed to update linked trips:', tripError)
    throw new DatabaseError('Failed to update job trips')
  }

  return { job }
}

export async function updateJobTrip(
  jobId: string,
  tripId: string,
  input: JobTripUpdateData
): Promise<{ trip: Trip; errors?: JobTripError[] }> {
  const supabase = await createClient()
  const { companyId } = await getAuthenticatedContext(supabase)

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .eq('job_id', jobId)
    .eq('company_id', companyId)
    .single()

  if (tripError || !trip) {
    throw new NotFoundError('Job trip not found')
  }

  const overlapErrors = await validateJobTripOverlaps(supabase, companyId, [
    {
      employee_id: trip.employee_id,
      entry_date: input.entry_date,
      exit_date: input.exit_date,
      excludeTripId: trip.id,
    },
  ])

  if (overlapErrors.length > 0) {
    return { trip, errors: overlapErrors }
  }

  const { data: updatedTrip, error } = await supabase
    .from('trips')
    .update({
      country: input.country,
      entry_date: input.entry_date,
      exit_date: input.exit_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tripId)
    .eq('job_id', jobId)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error || !updatedTrip) {
    console.error('[Jobs] Failed to update job trip:', error)
    throw new DatabaseError('Failed to update job trip')
  }

  return { trip: updatedTrip }
}

export async function removeJobTrip(jobId: string, tripId: string): Promise<void> {
  const supabase = await createClient()
  const { companyId } = await getAuthenticatedContext(supabase)

  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId)
    .eq('job_id', jobId)
    .eq('company_id', companyId)

  if (error) {
    console.error('[Jobs] Failed to remove job trip:', error)
    throw new DatabaseError('Failed to remove employee from job')
  }
}
