'use client'

import * as React from 'react'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

interface ExportFormProps {
  employees: Employee[]
  employeeCount: number
}

type ExportScope = 'all' | 'single' | 'filtered' | 'future-alerts'
type ExportFormat = 'csv' | 'pdf'
type StatusFilter = 'compliant' | 'at-risk' | 'non-compliant'
type AlertsFilter = 'all' | 'at-risk' | 'critical'

export function ExportForm({ employees, employeeCount }: ExportFormProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [scope, setScope] = React.useState<ExportScope>('all')
  const [employeeId, setEmployeeId] = React.useState<string | undefined>()
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter | undefined>()
  const [alertsFilter, setAlertsFilter] = React.useState<AlertsFilter>('all')
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [exportFormat, setExportFormat] = React.useState<ExportFormat>('pdf')

  // Handle export
  const handleExport = async () => {
    // Date range not required for future-alerts (it calculates based on future trips)
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
      // For future-alerts, use today as the reference date
      const effectiveDateRange = scope === 'future-alerts'
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

      // Trigger download
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

  // Download file helper
  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    let blob: Blob

    if (mimeType === 'application/pdf') {
      // PDF is base64 encoded
      const binaryString = atob(content)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      blob = new Blob([bytes], { type: mimeType })
    } else {
      // CSV is plain text
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
    <Card>
      <CardHeader>
        <CardTitle>Export Compliance Data</CardTitle>
        <CardDescription>
          Generate CSV or PDF reports for compliance tracking and audit submissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scope Selection */}
        <div className="space-y-3">
          <Label>Scope</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <ScopeOption
              value="all"
              selected={scope === 'all'}
              onClick={() => setScope('all')}
              title={`All employees (${employeeCount})`}
              description="Export data for all employees"
            />
            <ScopeOption
              value="single"
              selected={scope === 'single'}
              onClick={() => setScope('single')}
              title="Single employee"
              description="Export data for one employee"
            />
            <ScopeOption
              value="filtered"
              selected={scope === 'filtered'}
              onClick={() => setScope('filtered')}
              title="Filtered by status"
              description="Export by compliance status"
            />
            <ScopeOption
              value="future-alerts"
              selected={scope === 'future-alerts'}
              onClick={() => setScope('future-alerts')}
              title="Future job alerts"
              description="Export planned trip forecasts"
            />
          </div>
        </div>

        {/* Single Employee Selection */}
        {scope === 'single' && (
          <div className="space-y-2">
            <Label htmlFor="employee-select">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger id="employee-select" className="w-full">
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

        {/* Status Filter Selection */}
        {scope === 'filtered' && (
          <div className="space-y-2">
            <Label htmlFor="status-select">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger id="status-select" className="w-full">
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
                    Non-Compliant
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Alerts Filter Selection */}
        {scope === 'future-alerts' && (
          <div className="space-y-2">
            <Label htmlFor="alerts-filter-select">Filter Alerts</Label>
            <Select
              value={alertsFilter}
              onValueChange={(v) => setAlertsFilter(v as AlertsFilter)}
            >
              <SelectTrigger id="alerts-filter-select" className="w-full">
                <SelectValue placeholder="Select alert filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center gap-2">
                    All future trips
                  </span>
                </SelectItem>
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

        {/* Date Range - not shown for future alerts */}
        {scope !== 'future-alerts' && (
          <div className="space-y-2">
            <Label>Date Range</Label>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        )}

        {/* Info for Future Alerts */}
        {scope === 'future-alerts' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-800">
              This export includes all future scheduled trips and their compliance forecasts.
              Trips are evaluated based on the 90/180-day rule from today&apos;s date.
            </p>
          </div>
        )}

        {/* Format Selection */}
        <div className="space-y-3">
          <Label>Format</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <FormatOption
              value="csv"
              selected={exportFormat === 'csv'}
              onClick={() => setExportFormat('csv')}
              icon={<FileSpreadsheet className="h-5 w-5" />}
              title="CSV"
              description="For spreadsheet analysis"
            />
            <FormatOption
              value="pdf"
              selected={exportFormat === 'pdf'}
              onClick={() => setExportFormat('pdf')}
              icon={<FileText className="h-5 w-5" />}
              title="PDF"
              description="For audit submission"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-3">
        <Button variant="outline" disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleExport} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Generate Export
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

// Scope option button
interface ScopeOptionProps {
  value: string
  selected: boolean
  onClick: () => void
  title: string
  description: string
}

function ScopeOption({
  selected,
  onClick,
  title,
  description,
}: ScopeOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:bg-accent'
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`h-4 w-4 rounded-full border-2 ${
            selected ? 'border-primary bg-primary' : 'border-muted-foreground'
          }`}
        >
          {selected && (
            <div className="m-0.5 h-2 w-2 rounded-full bg-white" />
          )}
        </div>
        <span className="font-medium text-sm">{title}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground pl-6">{description}</p>
    </button>
  )
}

// Format option button
interface FormatOptionProps {
  value: string
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  description: string
}

function FormatOption({
  selected,
  onClick,
  icon,
  title,
  description,
}: FormatOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:bg-accent'
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
          selected ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{title}</span>
          {selected && (
            <span className="text-xs text-primary">(Selected)</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  )
}
