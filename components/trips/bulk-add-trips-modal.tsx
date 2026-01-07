'use client'

import { useState } from 'react'
import { ListPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BulkAddTripsForm } from './bulk-add-trips-form'

interface BulkAddTripsModalProps {
  employeeId: string
  employeeName: string
}

export function BulkAddTripsModal({
  employeeId,
  employeeName,
}: BulkAddTripsModalProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ListPlus className="h-4 w-4 mr-2" />
          Bulk Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <BulkAddTripsForm
          employeeId={employeeId}
          employeeName={employeeName}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
