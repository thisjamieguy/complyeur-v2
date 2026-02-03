'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CountrySelect } from './country-select'
import { toast } from 'sonner'

interface TripRow {
  id: string
  country: string
  entryDate: string
  exitDate: string
  purpose: string
  jobRef: string
  error?: string
}

interface BulkAddTripsFormProps {
  employeeId: string
  employeeName: string
  onSuccess: () => void
  onCancel: () => void
}

const MAX_ROWS = 20
const INITIAL_ROWS = 3

function createEmptyRow(): TripRow {
  const today = new Date().toISOString().split('T')[0]
  return {
    id: crypto.randomUUID(),
    country: '',
    entryDate: today,
    exitDate: today,
    purpose: '',
    jobRef: '',
  }
}

export function BulkAddTripsForm({
  employeeId,
  employeeName,
  onSuccess,
  onCancel,
}: BulkAddTripsFormProps) {
  const [rows, setRows] = useState<TripRow[]>(
    Array.from({ length: INITIAL_ROWS }, createEmptyRow)
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addRow = () => {
    if (rows.length < MAX_ROWS) {
      setRows([...rows, createEmptyRow()])
    }
  }

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.id !== id))
    }
  }

  const updateRow = (id: string, field: keyof TripRow, value: string) => {
    setRows(
      rows.map((row) =>
        row.id === id ? { ...row, [field]: value, error: undefined } : row
      )
    )
  }

  const validateRows = (): boolean => {
    let isValid = true
    const updatedRows = rows.map((row) => {
      // Skip completely empty rows
      if (!row.country && !row.entryDate && !row.exitDate) {
        return row
      }

      // Validate required fields
      if (!row.country) {
        isValid = false
        return { ...row, error: 'Country is required' }
      }
      if (!row.entryDate) {
        isValid = false
        return { ...row, error: 'Entry date is required' }
      }
      if (!row.exitDate) {
        isValid = false
        return { ...row, error: 'Exit date is required' }
      }

      // Validate date order
      if (new Date(row.exitDate) < new Date(row.entryDate)) {
        isValid = false
        return { ...row, error: 'Exit date must be after entry date' }
      }

      return row
    })

    setRows(updatedRows)

    // Check we have at least one valid trip
    const validTrips = updatedRows.filter(
      (row) => row.country && row.entryDate && row.exitDate && !row.error
    )
    if (validTrips.length === 0) {
      toast.error('Please add at least one valid trip')
      return false
    }

    return isValid
  }

  const handleSubmit = async () => {
    if (!validateRows()) return

    setIsSubmitting(true)

    // Filter to only rows with data
    const tripsToCreate = rows
      .filter((row) => row.country && row.entryDate && row.exitDate && !row.error)
      .map((row) => ({
        employee_id: employeeId,
        country: row.country,
        entry_date: row.entryDate,
        exit_date: row.exitDate,
        purpose: row.purpose || undefined,
        job_ref: row.jobRef || undefined,
      }))

    try {
      const { bulkAddTripsAction } = await import('@/app/(dashboard)/actions')
      const result = await bulkAddTripsAction(tripsToCreate)

      if (result.errors && result.errors.length > 0) {
        toast.error(`${result.errors.length} trip(s) failed validation`)
        // Map errors back to rows
        const errorMap = new Map(
          result.errors.map((e) => [e.index, e.message])
        )
        setRows(
          rows.map((row, idx) => ({
            ...row,
            error: errorMap.get(idx) as string | undefined,
          }))
        )
        if (result.created === 0) {
          return
        }
      }

      toast.success(`${result.created} trip(s) added successfully`)
      onSuccess()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create trips'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Bulk Add Trips</h2>
        <p className="text-sm text-muted-foreground">
          Adding trips for <span className="font-medium">{employeeName}</span>
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="p-4 border rounded-lg bg-muted/30"
          >
            <div className="flex flex-wrap gap-3 items-end">
              <div className="w-full sm:w-36">
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Country *
                </Label>
                <CountrySelect
                  value={row.country}
                  onValueChange={(value) => updateRow(row.id, 'country', value)}
                  disabled={isSubmitting}
                  placeholder="Select..."
                />
              </div>

              <div className="w-[calc(50%-6px)] sm:w-32">
                <Label className="text-xs text-muted-foreground mb-1 block">Entry *</Label>
                <Input
                  type="date"
                  value={row.entryDate}
                  onChange={(e) => updateRow(row.id, 'entryDate', e.target.value)}
                  disabled={isSubmitting}
                  className="w-full"
                />
              </div>

              <div className="w-[calc(50%-6px)] sm:w-32">
                <Label className="text-xs text-muted-foreground mb-1 block">Exit *</Label>
                <Input
                  type="date"
                  value={row.exitDate}
                  onChange={(e) => updateRow(row.id, 'exitDate', e.target.value)}
                  disabled={isSubmitting}
                  className="w-full"
                />
              </div>

              <div className="w-[calc(50%-6px)] sm:w-28 sm:flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Purpose</Label>
                <Input
                  placeholder="Optional"
                  value={row.purpose}
                  onChange={(e) => updateRow(row.id, 'purpose', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="w-[calc(50%-6px)] sm:w-28 sm:flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Job Ref</Label>
                <Input
                  placeholder="Optional"
                  value={row.jobRef}
                  onChange={(e) => updateRow(row.id, 'jobRef', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(row.id)}
                disabled={rows.length === 1 || isSubmitting}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {row.error && (
              <p className="text-sm text-destructive mt-2">{row.error}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={rows.length >= MAX_ROWS || isSubmitting}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Row ({rows.length}/{MAX_ROWS})
        </Button>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save All Trips
          </Button>
        </div>
      </div>
    </div>
  )
}
