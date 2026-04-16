import Link from 'next/link'
import { BriefcaseBusiness } from 'lucide-react'
import { getEmployeesForSelect, getJobs } from '@/lib/db'
import { getCountryName } from '@/lib/constants/schengen-countries'
import { parseDateOnlyAsUTC } from '@/lib/compliance/date-utils'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { JobCreateDialog } from '@/components/jobs/job-create-dialog'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Jobs',
  description: 'Create and review saved jobs linked to employee trips',
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parseDateOnlyAsUTC(dateString))
}

export default async function JobsPage() {
  const [jobs, employees] = await Promise.all([
    getJobs(),
    getEmployeesForSelect(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Jobs</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create saved jobs and assign existing employees to the same planned work.
          </p>
        </div>
        <JobCreateDialog employees={employees} />
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            No jobs yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Create a job when several employees are travelling for the same customer or project.
          </p>
          <div className="mt-6">
            <JobCreateDialog employees={employees} />
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium text-slate-900">
                    {job.job_ref}
                  </TableCell>
                  <TableCell>{job.customer}</TableCell>
                  <TableCell>{getCountryName(job.country)}</TableCell>
                  <TableCell>
                    {formatDate(job.entry_date)} - {formatDate(job.exit_date)}
                  </TableCell>
                  <TableCell>{job.trip_count}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/jobs/${job.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
