'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CountrySelect } from '@/components/trips/country-select'
import { createJobAction } from '@/app/(dashboard)/jobs/actions'
import { showError, showSuccess } from '@/lib/toast'

export interface JobEmployeeOption {
  id: string
  name: string
}

interface SelectedEmployeeRow {
  employee_id: string
  country: string
  entry_date: string
  exit_date: string
}

interface JobFormState {
  job_ref: string
  customer: string
  country: string
  entry_date: string
  exit_date: string
  purpose: string
}

interface JobFormProps {
  employees: JobEmployeeOption[]
  onSuccess?: () => void
}

const today = format(new Date(), 'yyyy-MM-dd')

const initialFormState: JobFormState = {
  job_ref: '',
  customer: '',
  country: '',
  entry_date: today,
  exit_date: today,
  purpose: '',
}

export function JobForm({ employees, onSuccess }: JobFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<JobFormState>(initialFormState)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [rows, setRows] = useState<SelectedEmployeeRow[]>([])
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedIds = useMemo(
    () => new Set(rows.map((row) => row.employee_id)),
    [rows]
  )

  const availableEmployees = employees.filter(
    (employee) => !selectedIds.has(employee.id)
  )

  function updateDefaultField<K extends keyof JobFormState>(
    field: K,
    value: JobFormState[K]
  ) {
    setForm((current) => {
      const previousValue = current[field]
      const next = { ...current, [field]: value }

      if (field === 'country' || field === 'entry_date' || field === 'exit_date') {
        const travelField = field as keyof Omit<SelectedEmployeeRow, 'employee_id'>
        setRows((currentRows) =>
          currentRows.map((row) =>
            row[travelField] === previousValue
              ? { ...row, [travelField]: value }
              : row
          )
        )
      }

      return next
    })
  }

  function addEmployee() {
    if (!selectedEmployeeId) return

    setRows((current) => [
      ...current,
      {
        employee_id: selectedEmployeeId,
        country: form.country,
        entry_date: form.entry_date,
        exit_date: form.exit_date,
      },
    ])
    setSelectedEmployeeId('')
    setRowErrors((current) => {
      const next = { ...current }
      delete next[selectedEmployeeId]
      return next
    })
  }

  function updateRow(
    employeeId: string,
    field: keyof Omit<SelectedEmployeeRow, 'employee_id'>,
    value: string
  ) {
    setRows((current) =>
      current.map((row) =>
        row.employee_id === employeeId ? { ...row, [field]: value } : row
      )
    )
    setRowErrors((current) => {
      const next = { ...current }
      delete next[employeeId]
      return next
    })
  }

  function removeRow(employeeId: string) {
    setRows((current) => current.filter((row) => row.employee_id !== employeeId))
    setRowErrors((current) => {
      const next = { ...current }
      delete next[employeeId]
      return next
    })
  }

  function getEmployeeName(employeeId: string): string {
    return employees.find((employee) => employee.id === employeeId)?.name ?? 'Employee'
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setRowErrors({})

    if (rows.length === 0) {
      setError('Add at least one employee to this job.')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createJobAction({
        job_ref: form.job_ref,
        customer: form.customer,
        country: form.country,
        entry_date: form.entry_date,
        exit_date: form.exit_date,
        purpose: form.purpose,
        employees: rows,
      })

      if (!result.success) {
        if (result.errors?.length) {
          setRowErrors(
            Object.fromEntries(
              result.errors.map((rowError) => [
                rowError.employeeId,
                rowError.message,
              ])
            )
          )
          setError('Some employees have conflicting trip dates.')
          return
        }

        const message = result.error ?? 'Failed to create job'
        setError(message)
        showError('Failed to create job', message)
        return
      }

      showSuccess('Job created')
      onSuccess?.()
      router.push(`/jobs/${result.jobId}`)
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="job_ref">Job Reference</Label>
          <Input
            id="job_ref"
            value={form.job_ref}
            onChange={(event) => updateDefaultField('job_ref', event.target.value)}
            disabled={isSubmitting}
            placeholder="JOB-1042"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer">Customer</Label>
          <Input
            id="customer"
            value={form.customer}
            onChange={(event) => updateDefaultField('customer', event.target.value)}
            disabled={isSubmitting}
            placeholder="Acme GmbH"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Country</Label>
          <CountrySelect
            value={form.country}
            onValueChange={(value) => updateDefaultField('country', value)}
            disabled={isSubmitting}
            placeholder="Select country..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="purpose">Purpose</Label>
          <Input
            id="purpose"
            value={form.purpose}
            onChange={(event) => updateDefaultField('purpose', event.target.value)}
            disabled={isSubmitting}
            placeholder="Installation, audit, client visit"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="entry_date">Entry Date</Label>
          <Input
            id="entry_date"
            type="date"
            value={form.entry_date}
            onChange={(event) => updateDefaultField('entry_date', event.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="exit_date">Exit Date</Label>
          <Input
            id="exit_date"
            type="date"
            value={form.exit_date}
            onChange={(event) => updateDefaultField('exit_date', event.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label>Add Employee</Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
              disabled={isSubmitting || availableEmployees.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    availableEmployees.length === 0
                      ? 'All employees added'
                      : 'Select employee'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addEmployee}
            disabled={!selectedEmployeeId || isSubmitting}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            No employees added yet.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.employee_id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="grid gap-3 sm:grid-cols-[1fr_180px_150px_150px_auto] sm:items-end">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {getEmployeeName(row.employee_id)}
                    </p>
                    {rowErrors[row.employee_id] && (
                      <p className="mt-1 text-sm text-red-600">
                        {rowErrors[row.employee_id]}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Country</Label>
                    <CountrySelect
                      value={row.country}
                      onValueChange={(value) =>
                        updateRow(row.employee_id, 'country', value)
                      }
                      disabled={isSubmitting}
                      placeholder="Select..."
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Entry</Label>
                    <Input
                      type="date"
                      value={row.entry_date}
                      onChange={(event) =>
                        updateRow(row.employee_id, 'entry_date', event.target.value)
                      }
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Exit</Label>
                    <Input
                      type="date"
                      value={row.exit_date}
                      onChange={(event) =>
                        updateRow(row.employee_id, 'exit_date', event.target.value)
                      }
                      disabled={isSubmitting}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(row.employee_id)}
                    disabled={isSubmitting}
                    aria-label={`Remove ${getEmployeeName(row.employee_id)}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Job
        </Button>
      </div>
    </form>
  )
}
