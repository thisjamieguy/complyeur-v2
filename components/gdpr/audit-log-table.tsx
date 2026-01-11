'use client'

import * as React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format, parseISO } from 'date-fns'
import {
  Download,
  EyeOff,
  Trash2,
  RotateCcw,
  XCircle,
  Hourglass,
} from 'lucide-react'

interface AuditLogEntry {
  id: string
  action: string
  entityType: string
  entityId: string | null
  details: Record<string, unknown> | null
  userId: string | null
  createdAt: string
}

interface AuditLogTableProps {
  entries: AuditLogEntry[]
}

const actionConfig: Record<
  string,
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
  }
> = {
  DSAR_EXPORT: {
    label: 'Data Export',
    icon: Download,
    variant: 'default',
  },
  ANONYMIZE: {
    label: 'Anonymized',
    icon: EyeOff,
    variant: 'secondary',
  },
  SOFT_DELETE: {
    label: 'Deleted',
    icon: Trash2,
    variant: 'destructive',
  },
  RESTORE: {
    label: 'Restored',
    icon: RotateCcw,
    variant: 'outline',
  },
  HARD_DELETE: {
    label: 'Permanently Deleted',
    icon: XCircle,
    variant: 'destructive',
  },
  AUTO_PURGE: {
    label: 'Auto-Purge',
    icon: Hourglass,
    variant: 'secondary',
  },
}

/**
 * Displays the GDPR audit log with action details.
 */
export function AuditLogTable({ entries }: AuditLogTableProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-slate-500">No GDPR actions logged yet</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const config = actionConfig[entry.action] ?? {
              label: entry.action,
              icon: Download,
              variant: 'outline' as const,
            }
            const Icon = config.icon

            return (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap text-slate-600">
                  {format(parseISO(entry.createdAt), 'MMM d, yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  <Badge variant={config.variant} className="gap-1">
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {formatDetails(entry.action, entry.details)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function formatDetails(
  action: string,
  details: Record<string, unknown> | null
): string {
  if (!details) return '-'

  switch (action) {
    case 'DSAR_EXPORT':
      return `Exported data for ${details.employee_name ?? 'Unknown'} (${details.affected_trips_count ?? 0} trips)`

    case 'ANONYMIZE':
      return `${details.original_name ?? 'Employee'} → ${details.anonymized_name ?? 'ANON'}`

    case 'SOFT_DELETE':
      return `Deleted ${details.employee_name ?? 'Employee'} (${details.affected_trips_count ?? 0} trips)`

    case 'RESTORE':
      return `Restored ${details.employee_name ?? 'Employee'}`

    case 'HARD_DELETE':
      return `Permanently removed ${details.employee_name ?? 'Employee'} (${details.trips_deleted ?? 0} trips)`

    case 'AUTO_PURGE':
      return `Purged ${details.employees_deleted ?? 0} employees, ${details.trips_deleted ?? 0} trips`

    default:
      return JSON.stringify(details).substring(0, 100)
  }
}
