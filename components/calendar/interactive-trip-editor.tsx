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
import { addTripAction, updateTripAction } from '@/app/(dashboard)/actions'
import { checkTripOverlap } from '@/lib/validations/trip-overlap'
import { showError, showSuccess } from '@/lib/toast'

interface BaseTripEditorDraft {
  employeeId: string
  employeeName: string
  entryDate: string
  exitDate: string
}

interface CreateTripEditorDraft extends BaseTripEditorDraft {
  mode: 'create'
}

interface EditTripEditorDraft extends BaseTripEditorDraft {
  mode: 'edit'
  tripId: string
  country: string
  purpose: string | null
  jobRef: string | null
  isPrivate: boolean
  ghosted: boolean
}

export type TripEditorDraft = CreateTripEditorDraft | EditTripEditorDraft

interface InteractiveTripEditorProps {
  draft: TripEditorDraft | null
  onOpenChange: (open: boolean) => void
}

export function InteractiveTripEditor({
  draft,
  onOpenChange,
}: InteractiveTripEditorProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const open = draft !== null

  const close = () => {
    setError(null)
    onOpenChange(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      close()
      return
    }

    onOpenChange(true)
  }

  async function handleSubmit(data: TripFormValues) {
    if (!draft) return

    setIsLoading(true)
    setError(null)

    try {
      const overlapResult = await checkTripOverlap(
        draft.employeeId,
        data.entry_date,
        data.exit_date,
        draft.mode === 'edit' ? draft.tripId : undefined
      )

      if (overlapResult.hasOverlap) {
        const message =
          overlapResult.message || 'Trip overlaps with an existing trip'
        setError(message)
        showError('Trip overlap detected', message)
        return
      }

      if (draft.mode === 'edit') {
        await updateTripAction(draft.tripId, draft.employeeId, {
          country: data.country,
          entry_date: data.entry_date,
          exit_date: data.exit_date,
          purpose: data.purpose || null,
          job_ref: data.job_ref || null,
          is_private: data.is_private,
          ghosted: data.ghosted,
        })

        showSuccess('Trip updated successfully')
      } else {
        await addTripAction({
          employee_id: draft.employeeId,
          country: data.country,
          entry_date: data.entry_date,
          exit_date: data.exit_date,
          purpose: data.purpose,
          job_ref: data.job_ref,
          is_private: data.is_private,
          ghosted: data.ghosted,
        })

        showSuccess('Trip created successfully')
      }
      close()
      router.refresh()
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : draft.mode === 'edit'
            ? 'Failed to update trip'
            : 'Failed to create trip'
      setError(message)
      showError(
        draft.mode === 'edit' ? 'Failed to update trip' : 'Failed to create trip',
        message
      )
    } finally {
      setIsLoading(false)
    }
  }

  const isEditing = draft?.mode === 'edit'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit trip' : 'Add trip'}</DialogTitle>
          <DialogDescription>
            {draft
              ? isEditing
                ? `Update trip details for ${draft.employeeName}`
                : `Create a trip for ${draft.employeeName}`
              : 'Manage trip from the calendar'}
          </DialogDescription>
        </DialogHeader>
        {draft && (
          <TripForm
            onSubmit={handleSubmit}
            onCancel={close}
            isLoading={isLoading}
            submitLabel={isEditing ? 'Update Trip' : 'Create Trip'}
            defaultValues={{
              country: isEditing ? draft.country : undefined,
              entry_date: draft.entryDate,
              exit_date: draft.exitDate,
              purpose: isEditing ? draft.purpose ?? '' : '',
              job_ref: isEditing ? draft.jobRef ?? '' : '',
              is_private: isEditing ? draft.isPrivate : false,
              ghosted: isEditing ? draft.ghosted : false,
            }}
            error={error}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
