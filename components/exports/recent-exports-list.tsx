import { format, parseISO } from 'date-fns'
import { FileText, FileSpreadsheet } from 'lucide-react'
import type { RecentExport } from '@/app/actions/exports'

const REPORT_TYPE_LABELS: Record<string, string> = {
  compliance_summary: 'Company summary',
  individual_employee: 'Individual report',
  future_alerts: 'Planned trip forecast',
  travel_audit: 'Travel audit',
}

interface RecentExportsListProps {
  exports: RecentExport[]
}

export function RecentExportsList({ exports }: RecentExportsListProps) {
  if (exports.length === 0) return null

  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b">
        <span className="text-sm font-semibold text-slate-900">
          Recent exports
        </span>
      </div>
      <div className="divide-y">
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
                  <p className="text-xs text-slate-500">
                    {dateLabel} · {exp.recordCount} employee
                    {exp.recordCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono text-slate-600">
                  {exp.documentId}
                </p>
                <p className="text-xs text-slate-600">
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
