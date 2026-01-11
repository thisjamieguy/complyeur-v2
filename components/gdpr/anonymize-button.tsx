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
import { EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDestructiveAction } from './confirm-destructive-action'
import { anonymizeEmployeeGdpr } from '@/app/(dashboard)/gdpr/actions'

interface Employee {
  id: string
  name: string
  isAnonymized: boolean
}

interface AnonymizeButtonProps {
  employees: Employee[]
  onAnonymized?: () => void
}

/**
 * Anonymize employee button with double-confirmation.
 * This is an IRREVERSIBLE operation.
 */
export function AnonymizeButton({ employees, onAnonymized }: AnonymizeButtonProps) {
  const [selectedEmployee, setSelectedEmployee] = React.useState<string>('')
  const [isAnonymizing, setIsAnonymizing] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)

  const activeEmployees = employees.filter((emp) => !emp.isAnonymized)
  const selectedName = activeEmployees.find((e) => e.id === selectedEmployee)?.name ?? ''

  const handleAnonymize = async () => {
    if (!selectedEmployee) return

    setIsAnonymizing(true)

    try {
      const result = await anonymizeEmployeeGdpr(selectedEmployee)

      if (!result.success) {
        toast.error(result.error ?? 'Failed to anonymize employee')
        return
      }

      toast.success('Employee anonymized', {
        description: result.message,
      })

      setSelectedEmployee('')
      setShowConfirm(false)
      onAnonymized?.()
    } catch (error) {
      console.error('[Anonymize] Error:', error)
      toast.error('Failed to anonymize employee')
    } finally {
      setIsAnonymizing(false)
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
            variant="outline"
            onClick={() => setShowConfirm(true)}
            disabled={!selectedEmployee || isAnonymizing}
            className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
          >
            {isAnonymizing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Anonymizing...
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4" />
                Anonymize
              </>
            )}
          </Button>
        </div>

        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-500" />
            <div>
              <p className="font-medium">GDPR Right to Erasure (Alternative)</p>
              <p className="mt-1">
                Anonymization removes the employee&apos;s name while preserving their trip
                history for compliance reporting. This is useful when you need to keep
                historical data but remove personally identifiable information.
              </p>
              <p className="mt-2 font-medium text-amber-900">
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDestructiveAction
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Anonymize Employee"
        description={
          <p>
            You are about to permanently anonymize <strong>{selectedName}</strong>.
          </p>
        }
        consequences={[
          `Employee's name will be replaced with an anonymous ID`,
          `All trip history will be preserved`,
          `This action CANNOT be undone`,
          `Original name is logged for regulatory compliance`,
        ]}
        confirmText="ANONYMIZE"
        confirmButtonLabel="Anonymize Employee"
        isLoading={isAnonymizing}
        onConfirm={handleAnonymize}
      />
    </>
  )
}
