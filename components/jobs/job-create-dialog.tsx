'use client'

import { useState } from 'react'
import { BriefcaseBusiness } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { JobForm, type JobEmployeeOption } from './job-form'

interface JobCreateDialogProps {
  employees: JobEmployeeOption[]
  triggerLabel?: string
}

export function JobCreateDialog({
  employees,
  triggerLabel = 'New Job',
}: JobCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <BriefcaseBusiness className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>New Job</DialogTitle>
          <DialogDescription>
            Create a saved job and add one linked trip for each selected employee.
          </DialogDescription>
        </DialogHeader>
        <JobForm employees={employees} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
