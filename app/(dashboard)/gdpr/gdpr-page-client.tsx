'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Trash2, EyeOff, Clock, FileText } from 'lucide-react'
import { DsarExportButton } from '@/components/gdpr/dsar-export-button'
import { DeleteButton } from '@/components/gdpr/delete-button'
import { AnonymizeButton } from '@/components/gdpr/anonymize-button'
import { DeletedEmployeesTable } from '@/components/gdpr/deleted-employees-table'
import { AuditLogTable } from '@/components/gdpr/audit-log-table'
import type { DeletedEmployee } from '@/lib/gdpr'

interface Employee {
  id: string
  name: string
  isAnonymized: boolean
}

interface AuditLogEntry {
  id: string
  action: string
  entityType: string
  entityId: string | null
  details: Record<string, unknown> | null
  userId: string | null
  createdAt: string
}

interface GdprPageClientProps {
  employees: Employee[]
  deletedEmployees: DeletedEmployee[]
  auditLog: AuditLogEntry[]
}

export function GdprPageClient({
  employees,
  deletedEmployees,
  auditLog,
}: GdprPageClientProps) {
  const router = useRouter()

  const handleRefresh = () => {
    router.refresh()
  }

  return (
    <div className="space-y-8">
      {/* Data Subject Access Request */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            Right of Access (DSAR)
          </CardTitle>
          <CardDescription>
            Generate a data export containing all personal information held for an employee.
            Required under GDPR Article 15.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DsarExportButton employees={employees} />
        </CardContent>
      </Card>

      {/* Two-column layout for Delete and Anonymize */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Right to Erasure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Right to Erasure
            </CardTitle>
            <CardDescription>
              Delete an employee and their data. A 30-day recovery period applies
              before permanent deletion.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteButton employees={employees} onDeleted={handleRefresh} />
          </CardContent>
        </Card>

        {/* Anonymization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <EyeOff className="h-5 w-5 text-amber-600" />
              Anonymization
            </CardTitle>
            <CardDescription>
              Remove personally identifiable information while preserving trip data
              for compliance reporting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnonymizeButton employees={employees} onAnonymized={handleRefresh} />
          </CardContent>
        </Card>
      </div>

      {/* Deleted Employees Recovery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-600" />
            Deleted Employees (Recovery)
          </CardTitle>
          <CardDescription>
            Employees pending permanent deletion. Restore within the recovery window
            to prevent data loss.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeletedEmployeesTable
            employees={deletedEmployees}
            onRestored={handleRefresh}
          />
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-600" />
            GDPR Audit Log
          </CardTitle>
          <CardDescription>
            Record of all GDPR-related actions. This log is tamper-evident and
            maintained for regulatory compliance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogTable entries={auditLog} />
        </CardContent>
      </Card>
    </div>
  )
}
