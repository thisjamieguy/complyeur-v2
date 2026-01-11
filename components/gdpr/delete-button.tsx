'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Loader2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDestructiveAction } from './confirm-destructive-action'
import { deleteEmployeeGdpr } from '@/app/(dashboard)/gdpr/actions'
import { RECOVERY_PERIOD_DAYS } from '@/lib/gdpr/constants'

interface Employee {
  id: string
  name: string
  isAnonymized: boolean
}

interface DeleteButtonProps {
  employees: Employee[]
  onDeleted?: () => void
}

/**
 * Delete employee button with double-confirmation.
 */
export function DeleteButton({ employees, onDeleted }: DeleteButtonProps) {
  const [selectedEmployee, setSelectedEmployee] = React.useState<string>('')
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)

  const activeEmployees = employees.filter((emp) => !emp.isAnonymized)
  const selectedName = activeEmployees.find((e) => e.id === selectedEmployee)?.name ?? ''

  const handleDelete = async () => {
    if (!selectedEmployee) return

    setIsDeleting(true)

    try {
      const result = await deleteEmployeeGdpr(selectedEmployee)

      if (!result.success) {
        toast.error(result.error ?? 'Failed to delete employee')
        return
      }

      toast.success('Employee deleted', {
        description: result.message,
      })

      setSelectedEmployee('')
      setShowConfirm(false)
      onDeleted?.()
    } catch (error) {
      console.error('[Delete] Error:', error)
      toast.error('Failed to delete employee')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Select an employee..." />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-60">
                {activeEmployees.length === 0 ? (
                  <div className="p-2 text-sm text-slate-500">
                    No employees available
                  </div>
                ) : (
                  activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="destructive"
            onClick={() => setShowConfirm(true)}
            disabled={!selectedEmployee || isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Employee
              </>
            )}
          </Button>
        </div>

        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-red-500" />
            <div>
              <p className="font-medium">GDPR Article 17 - Right to Erasure</p>
              <p className="mt-1">
                Deleted employees can be recovered within {RECOVERY_PERIOD_DAYS} days.
                After that period, all data is permanently removed.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDestructiveAction
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Delete Employee"
        description={
          <p>
            You are about to delete <strong>{selectedName}</strong>.
          </p>
        }
        consequences={[
          `Employee will be hidden immediately`,
          `Can be restored within ${RECOVERY_PERIOD_DAYS} days`,
          `Permanently deleted after recovery period`,
          `This action is logged for compliance`,
        ]}
        confirmText="DELETE"
        confirmButtonLabel="Delete Employee"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </>
  )
}
