# Exports Split Panel Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-card exports form with a persistent two-column split panel: config on the left, live report preview + export history on the right.

**Architecture:** A new `ExportsClientShell` client component owns the shared state (`scope`, `dateRange`, `format`) and renders `ExportForm` (left) and `ReportPreview` (right) as siblings. The page stays a server component, fetching employees, compliance snapshot, and recent exports server-side and passing them into the shell. The compliance snapshot reuses the already-cached `getEmployeeComplianceData` call — no new DB round-trip needed.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui (Card, Label, Select, Button), date-fns, Supabase

---

## File Map

| File | Action |
|------|--------|
| `lib/data/employees.ts` | Add exported `getComplianceSnapshot()` function |
| `components/exports/report-preview.tsx` | **Create** — right-panel preview card |
| `components/exports/exports-client-shell.tsx` | **Create** — client wrapper that owns shared state and renders both columns |
| `components/exports/export-form.tsx` | Refactor — lift `scope`/`dateRange`/`format` state out; remove Card wrapper |
| `components/exports/index.ts` | Export new components |
| `app/(dashboard)/exports/page.tsx` | Restructure — add snapshot loader, pass all data to shell |

---

## Task 1: Add `getComplianceSnapshot` to the data layer

**Files:**
- Modify: `lib/data/employees.ts`

- [ ] **Step 1: Add the exported function at the bottom of `lib/data/employees.ts`**

Append after the last export in the file:

```typescript
/**
 * Return compliance status counts for the current company.
 * Reuses the cached getEmployeeComplianceData() — no extra DB round-trip.
 */
export async function getComplianceSnapshot(): Promise<ComplianceStats> {
  const employees = await getEmployeeComplianceData()
  return calculateStats(employees)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/jameswalsh/Dev/Web Projects/ComplyEur-v2/complyeur" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/data/employees.ts
git commit -m "feat(exports): add getComplianceSnapshot to data layer"
```

---

## Task 2: Create `ReportPreview` component

**Files:**
- Create: `components/exports/report-preview.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client'

import { differenceInDays } from 'date-fns'
import { FileText, FileSpreadsheet } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import type { ComplianceStats } from '@/types/dashboard'

type ExportScope = 'all' | 'single' | 'filtered' | 'future-alerts'
type ExportFormat = 'csv' | 'pdf'

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
  // Stat: employee count label based on scope
  const countLabel = scope === 'single' ? '1' : String(employeeCount)

  // Stat: day window
  const dayWindow =
    scope === 'future-alerts'
      ? null
      : dateRange?.from && dateRange?.to
        ? differenceInDays(dateRange.to, dateRange.from) + 1
        : null

  // Compliance bar proportions (exclude exempt from bar)
  const tracked = snapshot.total - snapshot.exempt
  const compliantPct = tracked > 0 ? (snapshot.compliant / tracked) * 100 : 0
  const atRiskPct = tracked > 0 ? (snapshot.at_risk / tracked) * 100 : 0
  const nonCompliantPct =
    tracked > 0
      ? ((snapshot.non_compliant + snapshot.breach) / tracked) * 100
      : 0

  return (
    <div className="flex flex-col gap-3">
      {/* Preview card */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-sm font-semibold text-slate-900">
            Report preview
          </span>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
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
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/jameswalsh/Dev/Web Projects/ComplyEur-v2/complyeur" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/exports/report-preview.tsx
git commit -m "feat(exports): add ReportPreview component"
```

---

## Task 3: Create `ExportsClientShell`

This is the thin client wrapper that owns shared state and renders both columns.

**Files:**
- Create: `components/exports/exports-client-shell.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client'

import * as React from 'react'
import type { DateRange } from 'react-day-picker'
import type { ComplianceStats } from '@/types/dashboard'
import type { RecentExport } from '@/app/actions/exports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExportForm } from './export-form'
import { ReportPreview } from './report-preview'
import { RecentExportsList } from './recent-exports-list'

type ExportScope = 'all' | 'single' | 'filtered' | 'future-alerts'
type ExportFormat = 'csv' | 'pdf'

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
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/jameswalsh/Dev/Web Projects/ComplyEur-v2/complyeur" && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors referencing `ExportForm` (not yet refactored) and `RecentExportsList` (not yet created) — that is fine at this stage.

- [ ] **Step 3: Commit**

```bash
git add components/exports/exports-client-shell.tsx
git commit -m "feat(exports): add ExportsClientShell layout wrapper"
```

---

## Task 4: Extract `RecentExportsList` into its own component

The recent exports rendering currently lives in `page.tsx` as a server component. Moving it to a standalone presentational component lets `ExportsClientShell` render it with data passed from the page.

**Files:**
- Create: `components/exports/recent-exports-list.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { format, parseISO } from 'date-fns'
import { FileText, FileSpreadsheet } from 'lucide-react'
import type { RecentExport } from '@/app/actions/exports'

const REPORT_TYPE_LABELS: Record<string, string> = {
  compliance_summary: 'Company summary',
  individual_employee: 'Individual report',
  future_alerts: 'Planned trip forecast',
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
          const label =
            REPORT_TYPE_LABELS[exp.reportType] ?? exp.reportType
          const dateLabel =
            exp.dateRange?.start && exp.dateRange?.end
              ? `${format(parseISO(exp.dateRange.start), 'd MMM yyyy')} – ${format(parseISO(exp.dateRange.end), 'd MMM yyyy')}`
              : null

          return (
            <div
              key={exp.id}
              className="flex items-center gap-3 px-4 py-3"
            >
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
                <p className="text-xs font-mono text-slate-400">
                  {exp.documentId}
                </p>
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/jameswalsh/Dev/Web Projects/ComplyEur-v2/complyeur" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add components/exports/recent-exports-list.tsx
git commit -m "feat(exports): extract RecentExportsList component"
```

---

## Task 5: Refactor `ExportForm` — lift state, remove Card wrapper

`ExportForm` loses ownership of `scope`, `dateRange`, and `exportFormat`. They come in as props. `isLoading`, `employeeId`, `statusFilter`, and `alertsFilter` remain local. The Card wrapper is removed (now rendered by `ExportsClientShell`).

**Files:**
- Modify: `components/exports/export-form.tsx`

- [ ] **Step 1: Replace the file content**

```typescript
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

type ExportScope = 'all' | 'single' | 'filtered' | 'future-alerts'
type ExportFormat = 'csv' | 'pdf'
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
  const [statusFilter, setStatusFilter] = React.useState<
    StatusFilter | undefined
  >()
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

      downloadFile(
        result.content,
        result.fileName,
        result.mimeType || 'application/octet-stream'
      )
      toast.success(`Export generated successfully (ID: ${result.documentId})`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate export'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const downloadFile = (
    content: string,
    fileName: string,
    mimeType: string
  ) => {
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

      {/* Status filter */}
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
            <SelectTrigger id="alerts-filter-select" className="w-full">
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
        <span
          className={`text-sm font-medium ${selected ? 'text-white' : 'text-foreground'}`}
        >
          {title}
        </span>
        <p
          className={`text-xs mt-0.5 ${selected ? 'text-slate-300' : 'text-muted-foreground'}`}
        >
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/jameswalsh/Dev/Web Projects/ComplyEur-v2/complyeur" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/exports/export-form.tsx
git commit -m "refactor(exports): lift scope/dateRange/format state to shell"
```

---

## Task 6: Update `components/exports/index.ts`

**Files:**
- Modify: `components/exports/index.ts`

- [ ] **Step 1: Read the current index**

```bash
cat "/Users/jameswalsh/Dev/Web Projects/ComplyEur-v2/complyeur/components/exports/index.ts"
```

- [ ] **Step 2: Add new exports**

Append to the existing file:

```typescript
export { ReportPreview } from './report-preview'
export { ExportsClientShell } from './exports-client-shell'
export { RecentExportsList } from './recent-exports-list'
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "/Users/jameswalsh/Dev/Web Projects/ComplyEur-v2/complyeur" && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add components/exports/index.ts
git commit -m "feat(exports): export new split-panel components from index"
```

---

## Task 7: Rewrite `app/(dashboard)/exports/page.tsx`

Replace the existing page with the split-panel layout. The page fetches employees, snapshot, and recent exports server-side and passes them into `ExportsClientShell`.

**Files:**
- Modify: `app/(dashboard)/exports/page.tsx`

- [ ] **Step 1: Replace the file**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/jameswalsh/Dev/Web Projects/ComplyEur-v2/complyeur" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Check the page in the browser at http://localhost:3000/exports**

Verify:
- Two-column layout renders on wide viewport
- Scope rows are full-width stacked (not 2×2 grid)
- Selecting a scope updates the preview stat tile and format strip reactively
- Changing format (CSV ↔ PDF) updates the format strip in the preview
- Recent exports list appears if there are previous exports
- Compliance bar reflects real employee data
- Generate Export still works end-to-end (triggers download)

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/exports/page.tsx
git commit -m "feat(exports): split-panel layout with live preview"
```
