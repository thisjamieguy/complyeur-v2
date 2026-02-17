'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TripForm, type TripFormValues } from '@/components/trips/trip-form'
import { addTripAction } from '@/app/(dashboard)/actions'
import { checkTripOverlap } from '@/lib/validations/trip-overlap'
import { showSuccess, showError } from '@/lib/toast'
import { trackEvent } from '@/lib/analytics/client'

interface QuickAddTripModalProps {
  employeeId: string
  employeeName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickAddTripModal({
  employeeId,
  employeeName,
  open,
  onOpenChange,
}: QuickAddTripModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(data: TripFormValues) {
    setIsLoading(true)
    setError(null)

    try {
      // Check for overlapping trips before saving
      const overlapResult = await checkTripOverlap(
        employeeId,
        data.entry_date,
        data.exit_date
      )

      if (overlapResult.hasOverlap) {
        setError(overlapResult.message || 'Trip overlaps with an existing trip')
        showError('Trip overlap detected', overlapResult.message)
        setIsLoading(false)
        return
      }

      await addTripAction({
        employee_id: employeeId,
        country: data.country,
        entry_date: data.entry_date,
        exit_date: data.exit_date,
        purpose: data.purpose || undefined,
        job_ref: data.job_ref || undefined,
        is_private: data.is_private,
        ghosted: data.ghosted,
      })

      showSuccess('Trip added successfully')
      trackEvent('add_trip', { source: 'quick_add' })
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to add trip'
      setError(message)
      showError('Failed to add trip', message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleCancel() {
    setError(null)
    onOpenChange(false)
  }

  // Reset error when modal closes
  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setError(null)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Trip</DialogTitle>
          <DialogDescription>
            Record a trip for {employeeName}
          </DialogDescription>
        </DialogHeader>
        <TripForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          submitLabel="Add Trip"
          error={error}
        />
      </DialogContent>
    </Dialog>
  )
}
