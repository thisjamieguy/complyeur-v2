import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllTripsGroupedByEmployee, getJobById } from '@/lib/db'
import { calculateFutureJobCompliance } from '@/lib/services/forecast-service'
import { isSavedJobsEnabled } from '@/lib/features'
import { Button } from '@/components/ui/button'
import { JobDetailClient } from '@/components/jobs/job-detail-client'
import type { ForecastResult, ForecastTrip } from '@/types/forecast'

export const dynamic = 'force-dynamic'

interface JobDetailPageProps {
  params: Promise<{ id: string }>
}

function toForecastTrip(trip: {
  id: string
  employee_id: string
  company_id: string
  country: string
  entry_date: string
  exit_date: string
  purpose: string | null
  job_ref: string | null
  is_private: boolean | null
  ghosted: boolean | null
  travel_days: number | null
}): ForecastTrip {
  return {
    id: trip.id,
    employeeId: trip.employee_id,
    companyId: trip.company_id,
    country: trip.country,
    entryDate: trip.entry_date,
    exitDate: trip.exit_date,
    purpose: trip.purpose,
    jobRef: trip.job_ref,
    isPrivate: trip.is_private ?? false,
    ghosted: trip.ghosted ?? false,
    travelDays: trip.travel_days ?? 0,
  }
}

function toSummary(result: ForecastResult) {
  return {
    riskLevel: result.riskLevel,
    daysUsedBeforeTrip: result.daysUsedBeforeTrip,
    daysRemainingAfterTrip: result.daysRemainingAfterTrip,
  }
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  if (!isSavedJobsEnabled()) {
    notFound()
  }

  const { id } = await params
  const [job, groupedData] = await Promise.all([
    getJobById(id),
    getAllTripsGroupedByEmployee(),
  ])

  if (!job) {
    notFound()
  }

  const summaries: Record<string, ReturnType<typeof toSummary>> = {}

  for (const trip of job.trips) {
    const employeeData = groupedData.get(trip.employee_id)
    if (!employeeData) continue

    const forecastTrip = toForecastTrip(trip)
    const result = calculateFutureJobCompliance(
      forecastTrip,
      employeeData.trips,
      employeeData.employee.name
    )
    summaries[trip.id] = toSummary(result)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="outline" size="sm" className="mb-4">
            <Link href="/jobs">Back to Jobs</Link>
          </Button>
          <h1 className="text-2xl font-semibold text-slate-900">
            {job.job_ref}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {job.customer}
          </p>
        </div>
      </div>

      <JobDetailClient job={job} summaries={summaries} />
    </div>
  )
}
