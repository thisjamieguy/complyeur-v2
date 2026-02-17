'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { addTripAction, deleteTripAction } from '@/app/(dashboard)/actions'
import { getCountryName } from '@/lib/constants/schengen-countries'
import { toast } from 'sonner'
import type { Trip } from '@/types/database-helpers'

interface DeleteTripDialogProps {
  trip: Trip
  employeeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function DeleteTripDialog({
  trip,
  employeeId,
  open,
  onOpenChange,
}: DeleteTripDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  async function handleUndo() {
    try {
      await addTripAction({
        employee_id: employeeId,
        country: trip.country,
        entry_date: trip.entry_date,
        exit_date: trip.exit_date,
        purpose: trip.purpose || undefined,
        job_ref: trip.job_ref || undefined,
        is_private: trip.is_private ?? false,
        ghosted: trip.ghosted ?? false,
      })
      toast.success('Trip restored.')
      window.dispatchEvent(
        new CustomEvent('complyeur:trip-updated', {
          detail: 'Trip restored successfully.',
        })
      )
      router.refresh()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not restore the deleted trip.'
      toast.error(message)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)

    try {
      await deleteTripAction(trip.id, employeeId)
      toast.success('Trip deleted successfully', {
        action: {
          label: 'Undo',
          onClick: () => {
            void handleUndo()
          },
        },
        duration: 7000,
      })
      window.dispatchEvent(
        new CustomEvent('complyeur:trip-updated', {
          detail: 'Trip deleted successfully.',
        })
      )
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete trip'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  const countryName = getCountryName(trip.country)
  const dateRange = `${formatDate(trip.entry_date)} - ${formatDate(trip.exit_date)}`

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Trip</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this trip to {countryName} (
            {dateRange})? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
