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
import { TripForm, type TripFormValues } from './trip-form'
import { updateTripAction } from '@/app/(dashboard)/actions'
import { checkTripOverlap } from '@/lib/validations/trip-overlap'
import { showSuccess, showError } from '@/lib/toast'
import type { Trip } from '@/types/database-helpers'

interface EditTripModalProps {
  trip: Trip
  employeeId: string
  employeeName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditTripModal({
  trip,
  employeeId,
  employeeName,
  open,
  onOpenChange,
}: EditTripModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(data: TripFormValues) {
    setIsLoading(true)
    setError(null)

    try {
      // Check for overlapping trips before updating (exclude this trip)
      const overlapResult = await checkTripOverlap(
        employeeId,
        data.entry_date,
        data.exit_date,
        trip.id // Exclude this trip from overlap check
      )

      if (overlapResult.hasOverlap) {
        setError(overlapResult.message || 'Trip overlaps with an existing trip')
        showError('Trip overlap detected', overlapResult.message)
        setIsLoading(false)
        return
      }

      await updateTripAction(trip.id, employeeId, {
        country: data.country,
        entry_date: data.entry_date,
        exit_date: data.exit_date,
        purpose: data.purpose || null,
        job_ref: data.job_ref || null,
        is_private: data.is_private,
        ghosted: data.ghosted,
      })

      showSuccess('Trip updated successfully')
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update trip'
      setError(message)
      showError('Failed to update trip', message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleCancel() {
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Trip</DialogTitle>
          <DialogDescription>
            Update trip details for {employeeName}
          </DialogDescription>
        </DialogHeader>
        <TripForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          submitLabel="Update Trip"
          trip={trip}
          error={error}
        />
      </DialogContent>
    </Dialog>
  )
}
