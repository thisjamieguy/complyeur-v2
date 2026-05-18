import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ExportsClientShell } from '@/components/exports/exports-client-shell'
import { Skeleton } from '@/components/ui/skeleton'
import { getEmployeesForExport, getRecentExports } from '@/app/actions/exports'
import { getComplianceSnapshot } from '@/lib/data/employees'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Export Data',
  description: 'Export compliance data as CSV or PDF reports',
}

function PageSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
      <div className="rounded-lg border bg-card p-6 space-y-5">
        <Skeleton className="h-5 w-36" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </div>
  )
}

async function ExportsLoader() {
  const [employees, snapshot, recentExports] = await Promise.all([
    getEmployeesForExport(),
    getComplianceSnapshot(),
    getRecentExports(5),
  ])

  return (
    <ExportsClientShell
      employees={employees}
      employeeCount={employees.length}
      snapshot={snapshot}
      recentExports={recentExports}
    />
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

      <Suspense fallback={<PageSkeleton />}>
        <ExportsLoader />
      </Suspense>
    </div>
  )
}
