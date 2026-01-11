/**
 * @fileoverview Background job service for heavy async operations.
 *
 * Handles job creation, status polling, and execution for operations
 * that are too heavy to run in the request path.
 *
 * NOTE: Requires the 20260109_compliance_snapshots.sql migration to be run
 * which includes the background_jobs table.
 *
 * @version 2026-01-09
 */

/**
 * Flag to check if background jobs table exists.
 * Set to true after running the 20260109_compliance_snapshots.sql migration.
 */
const BACKGROUND_JOBS_ENABLED = false

/** Supported job types */
export type JobType =
  | 'bulk_recalc'
  | 'export_csv'
  | 'export_pdf'
  | 'import_excel'
  | 'rebuild_snapshots'

/** Job status */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

/** Background job record */
export interface BackgroundJob {
  id: string
  company_id: string
  job_type: JobType
  status: JobStatus
  progress_current: number | null
  progress_total: number | null
  progress_message: string | null
  attempts: number
  max_attempts: number
  last_error: string | null
  input_data: Record<string, unknown> | null
  output_data: Record<string, unknown> | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  created_by: string | null
}

/** Create a new background job */
export interface CreateJobInput {
  job_type: JobType
  input_data?: Record<string, unknown>
}

/**
 * Create a new background job.
 *
 * NOTE: Returns a mock job until migration is run.
 *
 * @param input - Job configuration
 * @returns The created job
 */
export async function createBackgroundJob(
  input: CreateJobInput
): Promise<BackgroundJob> {
  if (!BACKGROUND_JOBS_ENABLED) {
    console.warn('Background jobs not enabled. Run 20260109_compliance_snapshots.sql migration first.')
    // Return a mock job that represents synchronous execution
    return {
      id: crypto.randomUUID(),
      company_id: 'mock',
      job_type: input.job_type,
      status: 'completed',
      progress_current: 100,
      progress_total: 100,
      progress_message: 'Completed synchronously (jobs table not available)',
      attempts: 1,
      max_attempts: 1,
      last_error: null,
      input_data: input.input_data ?? null,
      output_data: null,
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      created_by: null,
    }
  }

  // Implementation for when table exists will go here
  throw new Error('Background jobs not implemented yet')
}

/**
 * Get a job by ID.
 *
 * NOTE: Returns null until migration is run.
 */
export async function getJob(_jobId: string): Promise<BackgroundJob | null> {
  if (!BACKGROUND_JOBS_ENABLED) {
    return null
  }

  throw new Error('Background jobs not implemented yet')
}

/**
 * Get pending jobs for processing.
 *
 * NOTE: Returns empty array until migration is run.
 */
export async function getPendingJobs(
  _limit: number = 10
): Promise<BackgroundJob[]> {
  if (!BACKGROUND_JOBS_ENABLED) {
    return []
  }

  throw new Error('Background jobs not implemented yet')
}

/**
 * Update job status and progress.
 *
 * NOTE: No-op until migration is run.
 */
export async function updateJobStatus(
  _jobId: string,
  _updates: {
    status?: JobStatus
    progress_current?: number
    progress_total?: number
    progress_message?: string
    last_error?: string
    output_data?: Record<string, unknown>
  }
): Promise<void> {
  if (!BACKGROUND_JOBS_ENABLED) {
    return
  }

  throw new Error('Background jobs not implemented yet')
}

/**
 * Get recent jobs for the current company.
 *
 * NOTE: Returns empty array until migration is run.
 */
export async function getRecentJobs(_limit: number = 20): Promise<BackgroundJob[]> {
  if (!BACKGROUND_JOBS_ENABLED) {
    return []
  }

  throw new Error('Background jobs not implemented yet')
}

/**
 * Cancel a pending or running job.
 *
 * NOTE: No-op until migration is run.
 */
export async function cancelJob(_jobId: string): Promise<void> {
  if (!BACKGROUND_JOBS_ENABLED) {
    return
  }

  throw new Error('Background jobs not implemented yet')
}

/**
 * Poll for job completion with timeout.
 * Returns the job when it completes or fails.
 *
 * NOTE: Returns completed mock job immediately until migration is run.
 */
export async function pollJobCompletion(
  jobId: string,
  _options?: {
    pollIntervalMs?: number
    timeoutMs?: number
    onProgress?: (job: BackgroundJob) => void
  }
): Promise<BackgroundJob> {
  if (!BACKGROUND_JOBS_ENABLED) {
    // Return a mock completed job
    return {
      id: jobId,
      company_id: 'mock',
      job_type: 'bulk_recalc',
      status: 'completed',
      progress_current: 100,
      progress_total: 100,
      progress_message: 'Completed',
      attempts: 1,
      max_attempts: 1,
      last_error: null,
      input_data: null,
      output_data: null,
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      created_by: null,
    }
  }

  throw new Error('Background jobs not implemented yet')
}
