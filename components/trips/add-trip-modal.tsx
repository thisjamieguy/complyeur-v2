'use client'

import { useState } from 'react'
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
import { toast } from 'sonner'

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
      await addTripAction({
        employee_id: employeeId,
        country: data.country,
        entry_date: data.entry_date,
        exit_date: data.exit_date,
        purpose: data.purpose || undefined,
        job_ref: data.job_ref || undefined,
      })

      toast.success('Trip added successfully')
      setOpen(false)
      router.refresh()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to add trip'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleCancel() {
    setError(null)
    setOpen(false)
  }

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
