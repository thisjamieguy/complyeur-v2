import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/server', () => ({
  after: vi.fn((callback: () => unknown) => {
    callback()
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/security/authorization', () => ({
  requireMutationPermission: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkServerActionRateLimit: vi.fn(),
}))

vi.mock('@/lib/services/alert-detection-service', () => ({
  detectAndProcessAlerts: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  createJobWithTrips: vi.fn(),
  getEmployeeById: vi.fn(),
  removeJobTrip: vi.fn(),
  updateJobTrip: vi.fn(),
  updateJobWithTrips: vi.fn(),
}))

const employeeA = '550e8400-e29b-41d4-a716-446655440000'
const employeeB = '550e8400-e29b-41d4-a716-446655440001'

function createValidJobPayload() {
  return {
    job_ref: 'JOB-1042',
    customer: 'Acme GmbH',
    country: 'DE',
    entry_date: '2026-06-01',
    exit_date: '2026-06-05',
    purpose: 'Site visit',
    employees: [
      {
        employee_id: employeeA,
        country: 'DE',
        entry_date: '2026-06-01',
        exit_date: '2026-06-05',
      },
      {
        employee_id: employeeB,
        country: 'FR',
        entry_date: '2026-06-02',
        exit_date: '2026-06-06',
      },
    ],
  }
}

async function setupAllowedMutation() {
  const { createClient } = await import('@/lib/supabase/server')
  const { requireMutationPermission } = await import('@/lib/security/authorization')
  const { checkServerActionRateLimit } = await import('@/lib/rate-limit')

  vi.mocked(createClient).mockResolvedValue({} as never)
  vi.mocked(requireMutationPermission).mockResolvedValue({
    allowed: true,
    user: { id: 'user-1' },
  } as never)
  vi.mocked(checkServerActionRateLimit).mockResolvedValue({
    allowed: true,
  } as never)
}

describe('job server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a job with multiple linked employee trips', async () => {
    await setupAllowedMutation()
    const { createJobWithTrips, getEmployeeById } = await import('@/lib/db')
    const { revalidatePath } = await import('next/cache')
    const { createJobAction } = await import('@/app/(dashboard)/jobs/actions')

    vi.mocked(createJobWithTrips).mockResolvedValue({
      job: {
        id: 'job-1',
        company_id: 'company-a',
        job_ref: 'JOB-1042',
        customer: 'Acme GmbH',
        country: 'DE',
        entry_date: '2026-06-01',
        exit_date: '2026-06-05',
        purpose: 'Site visit',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    })
    vi.mocked(getEmployeeById).mockResolvedValue({
      id: employeeA,
      company_id: 'company-a',
      name: 'Alice',
    } as never)

    const result = await createJobAction(createValidJobPayload())

    expect(result).toEqual({ success: true, jobId: 'job-1' })
    expect(createJobWithTrips).toHaveBeenCalledWith(createValidJobPayload())
    expect(revalidatePath).toHaveBeenCalledWith('/jobs/job-1')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
  })

  it('returns row-level errors when linked trips overlap', async () => {
    await setupAllowedMutation()
    const { createJobWithTrips } = await import('@/lib/db')
    const { createJobAction } = await import('@/app/(dashboard)/jobs/actions')

    vi.mocked(createJobWithTrips).mockResolvedValue({
      errors: [
        {
          employeeId: employeeA,
          message: 'Trip overlaps with existing trip (2026-06-01 - 2026-06-05).',
        },
      ],
    })

    const result = await createJobAction(createValidJobPayload())

    expect(result.success).toBe(false)
    expect(result.errors).toEqual([
      {
        employeeId: employeeA,
        message: 'Trip overlaps with existing trip (2026-06-01 - 2026-06-05).',
      },
    ])
  })

  it('passes the apply-to-trips decision when updating a job', async () => {
    await setupAllowedMutation()
    const { updateJobWithTrips } = await import('@/lib/db')
    const { updateJobAction } = await import('@/app/(dashboard)/jobs/actions')

    vi.mocked(updateJobWithTrips).mockResolvedValue({
      job: {
        id: 'job-1',
        company_id: 'company-a',
        job_ref: 'JOB-1042',
        customer: 'Acme GmbH',
        country: 'DE',
        entry_date: '2026-06-01',
        exit_date: '2026-06-05',
        purpose: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    })

    const payload = {
      job_ref: 'JOB-1042',
      customer: 'Acme GmbH',
      country: 'DE',
      entry_date: '2026-06-01',
      exit_date: '2026-06-05',
      purpose: '',
      applyToTrips: true,
    }

    const result = await updateJobAction('job-1', payload)

    expect(result).toEqual({ success: true, jobId: 'job-1' })
    expect(updateJobWithTrips).toHaveBeenCalledWith('job-1', {
      ...payload,
      purpose: null,
    })
  })
})
