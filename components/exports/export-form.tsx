'use client'

import * as React from 'react'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateRangePicker } from './date-range-picker'
import { toast } from 'sonner'
import { exportComplianceData } from '@/app/actions/exports'
import type { ExportOptions } from '@/lib/exports/types'

interface Employee {
  id: string
  name: string
}

export type ExportScope = 'all' | 'single' | 'filtered' | 'future-alerts'
export type ExportFormat = 'csv' | 'pdf'
type StatusFilter = 'compliant' | 'at-risk' | 'non-compliant'
type AlertsFilter = 'all' | 'at-risk' | 'critical'

interface ExportFormProps {
  employees: Employee[]
  employeeCount: number
  // Lifted state — owned by ExportsClientShell
  scope: ExportScope
  onScopeChange: (scope: ExportScope) => void
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
  exportFormat: ExportFormat
  onExportFormatChange: (format: ExportFormat) => void
}

export function ExportForm({
  employees,
  employeeCount,
  scope,
  onScopeChange,
  dateRange,
  onDateRangeChange,
  exportFormat,
  onExportFormatChange,
}: ExportFormProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [employeeId, setEmployeeId] = React.useState<string | undefined>()
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter | undefined>()
  const [alertsFilter, setAlertsFilter] = React.useState<AlertsFilter>('all')

  const handleExport = async () => {
    if (scope !== 'future-alerts' && (!dateRange?.from || !dateRange?.to)) {
      toast.error('Please select a date range')
      return
    }
    if (scope === 'single' && !employeeId) {
      toast.error('Please select an employee')
      return
    }
    if (scope === 'filtered' && !statusFilter) {
      toast.error('Please select a status filter')
      return
    }

    setIsLoading(true)
    try {
      const effectiveDateRange =
        scope === 'future-alerts'
          ? {
              start: format(new Date(), 'yyyy-MM-dd'),
              end: format(new Date(), 'yyyy-MM-dd'),
            }
          : {
              start: format(dateRange!.from!, 'yyyy-MM-dd'),
              end: format(dateRange!.to!, 'yyyy-MM-dd'),
            }

      const options: ExportOptions = {
        scope,
        employeeId: scope === 'single' ? employeeId : undefined,
        statusFilter: scope === 'filtered' ? statusFilter : undefined,
        alertsFilter: scope === 'future-alerts' ? alertsFilter : undefined,
        dateRange: effectiveDateRange,
        format: exportFormat,
      }

      const result = await exportComplianceData(options)

      if (!result.success || !result.content || !result.fileName) {
        toast.error(result.error || 'Export failed')
        return
      }

      downloadFile(result.content, result.fileName, result.mimeType || 'application/octet-stream')
      toast.success(`Export generated successfully (ID: ${result.documentId})`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate export'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    let blob: Blob
    if (mimeType === 'application/pdf') {
      const binaryString = atob(content)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      blob = new Blob([bytes], { type: mimeType })
    } else {
      blob = new Blob([content], { type: mimeType })
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      {/* Scope */}
      <div className="space-y-2">
        <Label>Scope</Label>
        <div className="flex flex-col gap-2">
          <ScopeOption
            selected={scope === 'all'}
            onClick={() => onScopeChange('all')}
            title={`All employees (${employeeCount})`}
            description="Full company overview — use for periodic audits"
          />
          <ScopeOption
            selected={scope === 'single'}
            onClick={() => onScopeChange('single')}
            title="Single employee"
            description="Individual report with full trip history"
          />
          <ScopeOption
            selected={scope === 'filtered'}
            onClick={() => onScopeChange('filtered')}
            title="By compliance status"
            description="Export only at-risk or non-compliant employees"
          />
          <ScopeOption
            selected={scope === 'future-alerts'}
            onClick={() => onScopeChange('future-alerts')}
            title="Planned trip forecast"
            description="Upcoming trips and their predicted compliance"
          />
        </div>
      </div>

      {/* Single employee selector */}
      {scope === 'single' && (
        <div className="space-y-2">
          <Label htmlFor="employee-select">Employee</Label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger
              id="employee-select"
              aria-label="Employee"
              className="w-full"
            >
              <SelectValue placeholder="Select an employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Status filter */}
      {scope === 'filtered' && (
        <div className="space-y-2">
          <Label htmlFor="status-select">Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger
              id="status-select"
              aria-label="Status"
              className="w-full"
            >
              <SelectValue placeholder="Select a status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compliant">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Compliant
                </span>
              </SelectItem>
              <SelectItem value="at-risk">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  At Risk
                </span>
              </SelectItem>
              <SelectItem value="non-compliant">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  High Risk
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Alerts filter */}
      {scope === 'future-alerts' && (
        <div className="space-y-2">
          <Label htmlFor="alerts-filter-select">Filter Alerts</Label>
          <Select
            value={alertsFilter}
            onValueChange={(v) => setAlertsFilter(v as AlertsFilter)}
          >
            <SelectTrigger
              id="alerts-filter-select"
              aria-label="Filter alerts"
              className="w-full"
            >
              <SelectValue placeholder="Select alert filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All future trips</SelectItem>
              <SelectItem value="at-risk">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  At Risk &amp; Critical only
                </span>
              </SelectItem>
              <SelectItem value="critical">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Critical only
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date range */}
      {scope !== 'future-alerts' && (
        <div className="space-y-2">
          <Label>Period</Label>
          <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
        </div>
      )}

      {/* Future alerts info */}
      {scope === 'future-alerts' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            This export includes all future scheduled trips and their compliance
            forecasts. Trips are evaluated based on the 90/180-day rule from
            today&apos;s date.
          </p>
        </div>
      )}

      {/* Format */}
      <div className="space-y-2">
        <Label>Format</Label>
        <div className="grid grid-cols-2 gap-2">
          <FormatOption
            selected={exportFormat === 'csv'}
            onClick={() => onExportFormatChange('csv')}
            icon={<FileSpreadsheet className="h-5 w-5" />}
            title="CSV"
            description="Open in Excel or Google Sheets"
          />
          <FormatOption
            selected={exportFormat === 'pdf'}
            onClick={() => onExportFormatChange('pdf')}
            icon={<FileText className="h-5 w-5" />}
            title="PDF"
            description="Formatted for audit — includes document ID"
          />
        </div>
      </div>

      {/* Generate */}
      <Button onClick={handleExport} disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Generate Export
          </>
        )}
      </Button>
    </div>
  )
}

interface ScopeOptionProps {
  selected: boolean
  onClick: () => void
  title: string
  description: string
}

function ScopeOption({ selected, onClick, title, description }: ScopeOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors w-full ${
        selected
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-border hover:bg-accent'
      }`}
    >
      <div
        className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
          selected ? 'border-white' : 'border-muted-foreground'
        }`}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>
      <div>
        <span className={`text-sm font-medium ${selected ? 'text-white' : 'text-foreground'}`}>
          {title}
        </span>
        <p className={`text-xs mt-0.5 ${selected ? 'text-slate-300' : 'text-muted-foreground'}`}>
          {description}
        </p>
      </div>
    </button>
  )
}

interface FormatOptionProps {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  description: string
}

function FormatOption({ selected, onClick, icon, title, description }: FormatOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          selected ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        {icon}
      </div>
      <div>
        <span className="text-sm font-medium">{title}</span>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  )
}
