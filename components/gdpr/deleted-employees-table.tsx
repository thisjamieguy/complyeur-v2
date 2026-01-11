'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RotateCcw, Loader2, Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { restoreEmployeeGdpr } from '@/app/(dashboard)/gdpr/actions'
import type { DeletedEmployee } from '@/lib/gdpr'

interface DeletedEmployeesTableProps {
  employees: DeletedEmployee[]
  onRestored?: () => void
}

/**
 * Table showing soft-deleted employees with restore functionality.
 */
export function DeletedEmployeesTable({
  employees,
  onRestored,
}: DeletedEmployeesTableProps) {
  const [restoringId, setRestoringId] = React.useState<string | null>(null)

  const handleRestore = async (employeeId: string) => {
    setRestoringId(employeeId)

    try {
      const result = await restoreEmployeeGdpr(employeeId)

      if (!result.success) {
        toast.error(result.error ?? 'Failed to restore employee')
        return
      }

      toast.success('Employee restored', {
        description: result.message,
      })

      onRestored?.()
    } catch (error) {
      console.error('[Restore] Error:', error)
      toast.error('Failed to restore employee')
    } finally {
      setRestoringId(null)
    }
  }

  if (employees.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-slate-500">No deleted employees</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee Name</TableHead>
            <TableHead>Deleted On</TableHead>
            <TableHead>Recovery Window</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((emp) => {
            const isUrgent = emp.daysRemaining <= 7
            const isExpired = emp.daysRemaining <= 0

            return (
              <TableRow key={emp.id}>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell className="text-slate-600">{emp.deletedAt}</TableCell>
                <TableCell>
                  {isExpired ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Expired
                    </Badge>
                  ) : isUrgent ? (
                    <Badge variant="destructive" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {emp.daysRemaining} day{emp.daysRemaining !== 1 ? 's' : ''} left
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {emp.daysRemaining} days left
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestore(emp.id)}
                    disabled={!emp.canRestore || restoringId === emp.id}
                    className="gap-1"
                  >
                    {restoringId === emp.id ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Restoring...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </>
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
