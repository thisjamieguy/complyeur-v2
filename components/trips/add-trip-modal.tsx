'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TripForm, type TripFormValues } from './trip-form'
import { addTripAction } from '@/app/(dashboard)/actions'
import { checkTripOverlap } from '@/lib/validations/trip-overlap'
import { showSuccess, showError } from '@/lib/toast'

interface AddTripModalProps {
  employeeId: string
  employeeName: string
}

export function AddTripModal({ employeeId, employeeName }: AddTripModalProps) {
  const [open, setOpen] = useState(false)
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
      window.dispatchEvent(
        new CustomEvent('complyeur:trip-updated', {
          detail: 'Trip added successfully.',
        })
      )
      setOpen(false)
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
    setOpen(false)
  }

  useEffect(() => {
    const openHandler = () => setOpen(true)
    window.addEventListener('complyeur:open-add-trip', openHandler)
    return () => window.removeEventListener('complyeur:open-add-trip', openHandler)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Trip
        </Button>
      </DialogTrigger>
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
