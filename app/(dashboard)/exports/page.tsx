import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ExportForm } from '@/components/exports/export-form'
import { getEmployeesForExport } from '@/app/actions/exports'
import { Skeleton } from '@/components/ui/skeleton'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Export Data | ComplyEur',
  description: 'Export compliance data as CSV or PDF reports',
}

/**
 * Server component to fetch employee data for export form
 */
async function ExportFormLoader() {
  const employees = await getEmployeesForExport()

  return <ExportForm employees={employees} employeeCount={employees.length} />
}

/**
 * Loading skeleton for export form
 */
function ExportFormSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-6">
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-16" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-16" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
    </div>
  )
}

/**
 * Exports page - Generate compliance reports
 */
export default async function ExportsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Export Compliance Data
        </h1>
        <p className="text-slate-500 mt-1">
          Generate reports for internal review or audit submissions
        </p>
      </div>

      {/* Info alert */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Export Information
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>CSV exports</strong> are best for data analysis in
                  Excel or Google Sheets
                </li>
                <li>
                  <strong>PDF exports</strong> are formatted for audit
                  submissions with document IDs
                </li>
                <li>
                  All exports include a unique document ID for audit tracking
                </li>
                <li>
                  The &quot;Last 180 days&quot; option covers the full rolling
                  Schengen compliance window
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Export form */}
      <Suspense fallback={<ExportFormSkeleton />}>
        <ExportFormLoader />
      </Suspense>
    </div>
  )
}
