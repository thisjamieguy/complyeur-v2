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
import { deleteTripAction } from '@/app/(dashboard)/actions'
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

  async function handleDelete() {
    setIsDeleting(true)

    try {
      await deleteTripAction(trip.id, employeeId)
      toast.success('Trip deleted successfully')
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
