'use client'

import * as React from 'react'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { Check, ChevronsUpDown, Download, FileSpreadsheet, FileText, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DateRangePicker } from './date-range-picker'
import { toast } from 'sonner'
import { exportTravelAudit, type TravelAuditOptions } from '@/app/actions/exports'
import { COUNTRY_LIST } from '@/lib/constants/schengen-countries'

interface Employee {
  id: string
  name: string
}

type AuditScope = 'individual' | 'company'
type AuditFormat = 'csv' | 'pdf'

interface TravelAuditFormProps {
  employees: Employee[]
}

export function TravelAuditForm({ employees }: TravelAuditFormProps) {
  const [scope, setScope] = React.useState<AuditScope>('company')
  const [employeeId, setEmployeeId] = React.useState<string | undefined>()
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [countries, setCountries] = React.useState<string[]>([])
  const [auditFormat, setAuditFormat] = React.useState<AuditFormat>('pdf')
  const [isLoading, setIsLoading] = React.useState(false)

  const handleExport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Please select a time frame')
      return
    }
    if (scope === 'individual' && !employeeId) {
      toast.error('Please select an employee')
      return
    }

    setIsLoading(true)
    try {
      const options: TravelAuditOptions = {
        scope,
        employeeId: scope === 'individual' ? employeeId : undefined,
        dateRange: {
          start: format(dateRange.from, 'yyyy-MM-dd'),
          end: format(dateRange.to, 'yyyy-MM-dd'),
        },
        countries: countries.length > 0 ? countries : undefined,
        format: auditFormat,
      }

      const result = await exportTravelAudit(options)

      if (!result.success || !result.content || !result.fileName) {
        toast.error(result.error || 'Audit export failed')
        return
      }

      downloadFile(result.content, result.fileName, result.mimeType || 'application/octet-stream')
      toast.success(`Audit generated (ID: ${result.documentId})`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate audit')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Scope */}
      <div className="space-y-2">
        <Label>Audit type</Label>
        <div className="flex flex-col gap-2">
          <ScopeOption
            selected={scope === 'company'}
            onClick={() => setScope('company')}
            title="Whole company"
            description="Every employee — countries, days, and a per-person breakdown"
          />
          <ScopeOption
            selected={scope === 'individual'}
            onClick={() => setScope('individual')}
            title="Single employee"
            description="One person — countries, days, working vs rest days"
          />
        </div>
      </div>

      {/* Employee selector */}
      {scope === 'individual' && (
        <div className="space-y-2">
          <Label htmlFor="audit-employee-select">Employee</Label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger id="audit-employee-select" aria-label="Employee" className="w-full">
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

      {/* Time frame */}
      <div className="space-y-2">
        <Label>Time frame</Label>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Country filter (customisation) */}
      <div className="space-y-2">
        <Label>Countries (optional)</Label>
        <CountryMultiSelect value={countries} onChange={setCountries} />
        <p className="text-xs text-muted-foreground">
          Leave empty to include all countries visited.
        </p>
      </div>

      {/* Format */}
      <div className="space-y-2">
        <Label>Format</Label>
        <div className="grid grid-cols-2 gap-2">
          <FormatOption
            selected={auditFormat === 'csv'}
            onClick={() => setAuditFormat('csv')}
            icon={<FileSpreadsheet className="h-5 w-5" />}
            title="CSV"
            description="Open in Excel or Google Sheets"
          />
          <FormatOption
            selected={auditFormat === 'pdf'}
            onClick={() => setAuditFormat('pdf')}
            icon={<FileText className="h-5 w-5" />}
            title="PDF"
            description="Audit format — includes document ID"
          />
        </div>
      </div>

      <Button onClick={handleExport} disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Generate Audit
          </>
        )}
      </Button>
    </div>
  )
}

function downloadFile(content: string, fileName: string, mimeType: string) {
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

interface CountryMultiSelectProps {
  value: string[]
  onChange: (value: string[]) => void
}

function CountryMultiSelect({ value, onChange }: CountryMultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const toggle = (code: string) => {
    onChange(
      value.includes(code) ? value.filter((c) => c !== code) : [...value, code]
    )
  }

  const nameFor = (code: string) =>
    COUNTRY_LIST.find((c) => c.code === code)?.name ?? code

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Filter by country"
            className="w-full justify-between font-normal"
          >
            {value.length > 0 ? `${value.length} selected` : 'All countries'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search countries…" />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {COUNTRY_LIST.map((country) => {
                  const selected = value.includes(country.code)
                  return (
                    <CommandItem
                      key={country.code}
                      value={`${country.name} ${country.code}`}
                      onSelect={() => toggle(country.code)}
                    >
                      <Check
                        className={
                          selected
                            ? 'mr-2 h-4 w-4 opacity-100'
                            : 'mr-2 h-4 w-4 opacity-0'
                        }
                      />
                      {country.name}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {country.code}
                      </span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((code) => (
            <Badge key={code} variant="secondary" className="gap-1">
              {nameFor(code)}
              <button
                type="button"
                onClick={() => toggle(code)}
                aria-label={`Remove ${nameFor(code)}`}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
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
        selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-border hover:bg-accent'
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
