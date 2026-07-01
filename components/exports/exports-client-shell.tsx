'use client'

import * as React from 'react'
import type { DateRange } from 'react-day-picker'
import type { ComplianceStats } from '@/types/dashboard'
import type { RecentExport } from '@/app/actions/exports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExportForm } from './export-form'
import type { ExportScope, ExportFormat } from './export-form'
import { ReportPreview } from './report-preview'
import { RecentExportsList } from './recent-exports-list'
import { TravelAuditForm } from './travel-audit-form'

interface ExportsClientShellProps {
  employees: { id: string; name: string }[]
  employeeCount: number
  snapshot: ComplianceStats
  recentExports: RecentExport[]
}

export function ExportsClientShell({
  employees,
  employeeCount,
  snapshot,
  recentExports,
}: ExportsClientShellProps) {
  const [scope, setScope] = React.useState<ExportScope>('all')
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [exportFormat, setExportFormat] = React.useState<ExportFormat>('pdf')

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        {/* Left column — config */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configure report</CardTitle>
          </CardHeader>
          <CardContent>
            <ExportForm
              employees={employees}
              employeeCount={employeeCount}
              scope={scope}
              onScopeChange={setScope}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              exportFormat={exportFormat}
              onExportFormatChange={setExportFormat}
            />
          </CardContent>
        </Card>

        {/* Right column — preview + history */}
        <div className="flex flex-col gap-3">
          <ReportPreview
            scope={scope}
            employeeCount={employeeCount}
            dateRange={dateRange}
            format={exportFormat}
            snapshot={snapshot}
          />
          <RecentExportsList exports={recentExports} />
        </div>
      </div>

      {/* Travel audit reports */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Travel audit</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Detailed travel reports for third-party requests — countries visited,
            days per country, and the working vs rest day split.
          </p>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Build audit report</CardTitle>
          </CardHeader>
          <CardContent className="lg:max-w-xl">
            <TravelAuditForm employees={employees} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
