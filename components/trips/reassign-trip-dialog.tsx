'use client'

import { useState } from 'react'
import { Loader2, UserMinus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getCountryName } from '@/lib/constants/schengen-countries'
import type { Trip, Employee } from '@/types/database'

interface ReassignTripDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trip: Trip
  currentEmployeeId: string
  currentEmployeeName: string
  employees: Pick<Employee, 'id' | 'name'>[]
  onSuccess?: () => void
}

export function ReassignTripDialog({
  open,
  onOpenChange,
  trip,
  currentEmployeeId,
  currentEmployeeName,
  employees,
  onSuccess,
}: ReassignTripDialogProps) {
  const [newEmployeeId, setNewEmployeeId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const availableEmployees = employees.filter(
    (emp) => emp.id !== currentEmployeeId
  )

  const handleReassign = async () => {
    if (!newEmployeeId) {
      toast.error('Please select an employee')
      return
    }

    setIsSubmitting(true)

    try {
      const { reassignTripAction } = await import('@/app/(dashboard)/actions')
      await reassignTripAction(trip.id, currentEmployeeId, newEmployeeId)

      const newEmployeeName = availableEmployees.find(e => e.id === newEmployeeId)?.name
      toast.success(`Trip reassigned to ${newEmployeeName}`)
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to reassign trip'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5" />
            Reassign Trip
          </DialogTitle>
          <DialogDescription>
            Move this trip from <span className="font-medium">{currentEmployeeName}</span> to another employee.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
            <p><span className="text-muted-foreground">Trip:</span> {trip.is_private ? 'XX (Private)' : getCountryName(trip.country)}</p>
            <p><span className="text-muted-foreground">Dates:</span> {formatDate(trip.entry_date)} - {formatDate(trip.exit_date)}</p>
            <p><span className="text-muted-foreground">Days:</span> {trip.travel_days}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reassign to</label>
            <Select value={newEmployeeId} onValueChange={setNewEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select new employee..." />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.length === 0 ? (
                  <div className="py-2 px-3 text-sm text-muted-foreground">
                    No other employees available
                  </div>
                ) : (
                  availableEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReassign}
            disabled={isSubmitting || !newEmployeeId || availableEmployees.length === 0}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Reassign Trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
