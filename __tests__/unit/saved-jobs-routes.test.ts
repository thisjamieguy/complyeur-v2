import { beforeEach, describe, expect, it, vi } from 'vitest'

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})

vi.mock('next/navigation', () => ({
  notFound,
}))

vi.mock('@/lib/db', () => ({
  getAllTripsGroupedByEmployee: vi.fn(),
  getEmployeesForSelect: vi.fn(),
  getJobById: vi.fn(),
  getJobs: vi.fn(),
}))

vi.mock('@/lib/services/forecast-service', () => ({
  calculateFutureJobCompliance: vi.fn(),
}))

vi.mock('@/components/jobs/job-create-dialog', () => ({
  JobCreateDialog: () => null,
}))

vi.mock('@/components/jobs/job-detail-client', () => ({
  JobDetailClient: () => null,
}))

describe('saved jobs route flag', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.FEATURE_SAVED_JOBS
  })

  it('blocks the jobs list route when saved jobs is disabled', async () => {
    const JobsPage = (await import('@/app/(dashboard)/jobs/page')).default

    await expect(JobsPage()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })

  it('blocks the job detail route when saved jobs is disabled', async () => {
    const JobDetailPage = (await import('@/app/(dashboard)/jobs/[id]/page')).default

    await expect(
      JobDetailPage({ params: Promise.resolve({ id: 'job-1' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })
})
