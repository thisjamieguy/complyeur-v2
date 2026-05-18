import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ExportForm } from '@/components/exports/export-form'
import { getEmployeesForExport, getRecentExports } from '@/app/actions/exports'
import { Skeleton } from '@/components/ui/skeleton'
import { format, parseISO } from 'date-fns'
import { FileText, FileSpreadsheet } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Export Data',
  description: 'Export compliance data as CSV or PDF reports',
}

async function ExportFormLoader() {
  const employees = await getEmployeesForExport()
  return <ExportForm employees={employees} employeeCount={employees.length} />
}

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
        <div className="flex justify-end">
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
    </div>
  )
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  compliance_summary: 'Company summary',
  individual_employee: 'Individual report',
  future_alerts: 'Planned trip forecast',
}

async function RecentExportsLoader() {
  const exports = await getRecentExports(5)

  if (exports.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-medium text-slate-700 mb-3">Recent exports</h2>
      <div className="rounded-lg border bg-card divide-y">
        {exports.map((exp) => {
          const label = REPORT_TYPE_LABELS[exp.reportType] ?? exp.reportType
          const dateLabel =
            exp.dateRange?.start && exp.dateRange?.end
              ? `${format(parseISO(exp.dateRange.start), 'd MMM yyyy')} – ${format(parseISO(exp.dateRange.end), 'd MMM yyyy')}`
              : null

          return (
            <div key={exp.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0">
                {exp.exportType === 'pdf' ? (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {label}
                  <span className="ml-2 font-normal text-slate-500 uppercase text-xs">
                    {exp.exportType}
                  </span>
                </p>
                {dateLabel && (
                  <p className="text-xs text-slate-500">{dateLabel} · {exp.recordCount} employee{exp.recordCount !== 1 ? 's' : ''}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono text-slate-400">{exp.documentId}</p>
                <p className="text-xs text-slate-400">
                  {format(parseISO(exp.generatedAt), 'd MMM, HH:mm')}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RecentExportsSkeleton() {
  return (
    <div>
      <Skeleton className="h-4 w-28 mb-3" />
      <div className="rounded-lg border bg-card divide-y">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-8 w-8 rounded-md shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-52" />
            </div>
            <div className="space-y-1 text-right">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function ExportsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Export Compliance Data
        </h1>
        <p className="text-slate-600 mt-1">
          Generate reports for internal review or audit submissions
        </p>
      </div>

      <Suspense fallback={<ExportFormSkeleton />}>
        <ExportFormLoader />
      </Suspense>

      <Suspense fallback={<RecentExportsSkeleton />}>
        <RecentExportsLoader />
      </Suspense>
    </div>
  )
}
