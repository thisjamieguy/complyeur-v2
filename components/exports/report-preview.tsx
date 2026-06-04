'use client'

import { differenceInDays } from 'date-fns'
import { FileText, FileSpreadsheet } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import type { ComplianceStats } from '@/types/dashboard'
import type { ExportScope, ExportFormat } from './export-form'

interface ReportPreviewProps {
  scope: ExportScope
  employeeCount: number
  dateRange: DateRange | undefined
  format: ExportFormat
  snapshot: ComplianceStats
}

export function ReportPreview({
  scope,
  employeeCount,
  dateRange,
  format,
  snapshot,
}: ReportPreviewProps) {
  const countLabel = scope === 'single' ? '1' : String(employeeCount)

  const dayWindow =
    scope === 'future-alerts'
      ? null
      : dateRange?.from && dateRange?.to
        ? differenceInDays(dateRange.to, dateRange.from) + 1
        : null

  const tracked = snapshot.total - snapshot.exempt
  const compliantPct = tracked > 0 ? (snapshot.compliant / tracked) * 100 : 0
  const atRiskPct = tracked > 0 ? (snapshot.at_risk / tracked) * 100 : 0
  const nonCompliantPct =
    tracked > 0
      ? ((snapshot.non_compliant + snapshot.breach) / tracked) * 100
      : 0

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm font-semibold text-slate-900">
          Report preview
        </span>
        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
          Live
        </span>
      </div>
      <div className="p-4 flex flex-col gap-4">
        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-slate-50 px-3 py-2">
            <p className="text-xl font-bold text-slate-900">{countLabel}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {scope === 'single' ? 'employee' : 'employees'}
            </p>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2">
            {dayWindow !== null ? (
              <>
                <p className="text-xl font-bold text-slate-900">{dayWindow}</p>
                <p className="text-xs text-slate-500 mt-0.5">day window</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-slate-400">—</p>
                <p className="text-xs text-slate-500 mt-0.5">future trips</p>
              </>
            )}
          </div>
        </div>

        {/* Compliance bar */}
        <div>
          <p className="text-xs text-slate-500 mb-1.5">Compliance snapshot</p>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
            {tracked > 0 ? (
              <>
                <div
                  className="bg-green-500"
                  style={{ width: `${compliantPct}%` }}
                />
                <div
                  className="bg-amber-400"
                  style={{ width: `${atRiskPct}%` }}
                />
                <div
                  className="bg-red-500"
                  style={{ width: `${nonCompliantPct}%` }}
                />
              </>
            ) : (
              <div className="w-full bg-slate-200 rounded-full" />
            )}
          </div>
          <div className="flex gap-4 mt-1.5">
            <span className="text-xs text-slate-500">
              <span className="font-semibold text-green-600">
                {snapshot.compliant}
              </span>{' '}
              compliant
            </span>
            <span className="text-xs text-slate-500">
              <span className="font-semibold text-amber-500">
                {snapshot.at_risk}
              </span>{' '}
              at risk
            </span>
            <span className="text-xs text-slate-500">
              <span className="font-semibold text-red-500">
                {snapshot.non_compliant + snapshot.breach}
              </span>{' '}
              non-compliant
            </span>
          </div>
        </div>

        {/* Format strip */}
        {format === 'pdf' ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 flex items-start gap-2">
            <FileText className="h-4 w-4 text-green-700 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-green-800">
                PDF · Audit format
              </p>
              <p className="text-xs text-green-700 mt-0.5">
                Unique document ID will be assigned on generation
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 flex items-start gap-2">
            <FileSpreadsheet className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-700">CSV</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Opens in Excel or Google Sheets
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
